import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { submitRateLimiter, checkRateLimit } from '@/lib/ratelimit';
import { validateSubmitExam } from '@/lib/validation';
import { calculatePSSScore } from '@/lib/scoring/pss';
import { calculateSRQ29Score } from '@/lib/scoring/srq29';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // ✅ Get and validate user session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ✅ RATE LIMITING: Fail-open for exam submission (critical path)
        // Redis outage should NOT prevent students from submitting their exams
        const rateLimit = await checkRateLimit(submitRateLimiter, `submit:${user.id}`, 1000, true);
        
        if (!rateLimit.success) {
            const resetTime = rateLimit.reset 
                ? new Date(rateLimit.reset).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                : 'beberapa menit';
            return NextResponse.json(
                { error: `Terlalu banyak percobaan submit. Tunggu hingga ${resetTime}.` },
                { status: 429 }
            );
        }

        // ✅ INPUT VALIDATION
        const body = await req.json();
        const validation = validateSubmitExam(body);
        
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { attemptId, answers } = validation.data!;
        const questionIds = Object.keys(answers).map(Number);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { id: examId } = await params;

            // ✅ TIMEZONE FIX: Calculate elapsed time in PostgreSQL to avoid JS/DB timezone mismatch
            const attemptValidation = await client.query(
                `SELECT ea.id, ea.status, ea.user_id, e.duration_minutes, e.exam_type,
                        EXTRACT(EPOCH FROM (NOW() - ea.start_time)) / 60 as elapsed_minutes
                 FROM exam_attempts ea
                 JOIN exams e ON ea.exam_id = e.id
                 WHERE ea.id = $1 AND ea.exam_id = $2`,
                [attemptId, examId]
            );

            if (attemptValidation.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Attempt tidak ditemukan' }, { status: 404 });
            }

            const attempt = attemptValidation.rows[0];

            // ✅ SECURITY FIX #1: Validate ownership - prevent submitting for other users
            if (attempt.user_id !== user.id) {
                await client.query('ROLLBACK');
                console.error(`SECURITY ALERT: User ${user.id} tried to submit for attempt ${attemptId} owned by user ${attempt.user_id}`);
                return NextResponse.json({ error: 'Unauthorized: Attempt bukan milik Anda' }, { status: 403 });
            }

            // ✅ SECURITY FIX #2: Prevent answer replay attack - only allow in_progress submissions
            if (attempt.status === 'completed') {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Ujian sudah diselesaikan sebelumnya' }, { status: 403 });
            }

            if (attempt.status !== 'in_progress') {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Status ujian tidak valid' }, { status: 403 });
            }

            // ✅ TIMEZONE FIX: Use elapsed_minutes from PostgreSQL query
            const elapsedMinutes = parseFloat(attempt.elapsed_minutes) || 0;
            const gracePeriodMinutes = 2; // 2 minutes grace for submission
            
            if (elapsedMinutes > attempt.duration_minutes + gracePeriodMinutes) {
                // Mark as completed with 0 score if time exceeded
                await client.query(
                    'UPDATE exam_attempts SET status = $1, score = 0, end_time = NOW() WHERE id = $2',
                    ['completed', attemptId]
                );
                await client.query('COMMIT');
                return NextResponse.json({ 
                    error: 'Waktu ujian telah habis. Jawaban tidak dapat disimpan.',
                    timeExpired: true 
                }, { status: 403 });
            }

            // ✅ OPTIMIZED: Single bulk query with explicit type casting
            const questionsData = await client.query(
                `SELECT q.id, q.marks, o.id as option_id, o.is_correct
                 FROM questions q
                 LEFT JOIN options o ON o.question_id = q.id
                 WHERE q.id = ANY($1::int[]) AND q.exam_id = $2`,
                [questionIds, examId]
            );

            // Build lookup maps for O(1) access
            const marksMap = new Map<number, number>();
            const correctnessMap = new Map<number, boolean>();

            questionsData.rows.forEach((row: { id: number; marks: number; option_id: number; is_correct: boolean }) => {
                marksMap.set(row.id, row.marks);
                correctnessMap.set(row.option_id, row.is_correct);
            });

            let totalScore = 0;
            let totalMax = 0;

            // ✅ TRUE BULK INSERT: Build single query with multiple VALUES
            const insertValues: string[] = [];
            const insertParams: (number | string)[] = [attemptId];

            questionIds.forEach((qId, index) => {
                const selectedOptId = answers[qId];
                const marks = marksMap.get(qId) || 1;
                const isCorrect = correctnessMap.get(selectedOptId) || false;

                totalMax += marks;
                if (isCorrect) {
                    totalScore += marks;
                }

                // Build parameterized VALUES clause: ($1, $2, $3), ($1, $4, $5), ...
                const paramOffset = index * 2 + 2; // Start from $2 (attemptId is $1)
                insertValues.push(`($1, $${paramOffset}, $${paramOffset + 1})`);
                insertParams.push(qId, selectedOptId);
            });

            // Execute single bulk INSERT (1 query instead of N queries)
            if (insertValues.length > 0) {
                const bulkInsertQuery = `
                    INSERT INTO exam_answers (attempt_id, question_id, selected_option_id)
                    VALUES ${insertValues.join(', ')}
                    ON CONFLICT (attempt_id, question_id)
                    DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id
                `;
                await client.query(bulkInsertQuery, insertParams);
            }

            // Get exam type for specialized scoring
            const examType = attempt.exam_type || 'general';
            let finalScore = 0;
            let pssResult = null;
            let srqResult = null;

            if (examType === 'pss') {
                // PSS Scoring: Get options with their text (to determine score 0-4)
                const pssData = await client.query(
                    `SELECT q.id as question_id, o.id as option_id, o.text as option_text
                     FROM questions q
                     JOIN options o ON o.question_id = q.id
                     WHERE q.exam_id = $1
                     ORDER BY q.id, o.id`,
                    [examId]
                );

                // Build map: optionId -> score based on option order
                const optionScoreMap = new Map<number, number>();
                let lastQId = -1;
                let optionIndex = 0;
                
                pssData.rows.forEach((row: { question_id: number; option_id: number }) => {
                    if (row.question_id !== lastQId) {
                        optionIndex = 0;
                        lastQId = row.question_id;
                    }
                    optionScoreMap.set(row.option_id, optionIndex);
                    optionIndex++;
                });

                // Build answers array for PSS scoring (10 values, 0-4 each)
                const sortedQuestionIds = [...new Set(pssData.rows.map((r: { question_id: number }) => r.question_id))];
                const pssAnswers: number[] = sortedQuestionIds.map((qId) => {
                    const selectedOptionId = answers[qId as number];
                    return optionScoreMap.get(selectedOptionId) ?? 0;
                });

                const pssScoreResult = calculatePSSScore(pssAnswers);
                finalScore = pssScoreResult.totalScore;
                pssResult = JSON.stringify({
                    rawScore: pssScoreResult.rawScore,
                    totalScore: pssScoreResult.totalScore,
                    level: pssScoreResult.level,
                    levelLabel: pssScoreResult.levelLabel,
                    description: pssScoreResult.description
                });

                // Update with PSS result
                await client.query(
                    `UPDATE exam_attempts 
                     SET score = $1, status = 'completed', end_time = NOW(), pss_result = $2, pss_category = $3
                     WHERE id = $4`,
                    [finalScore, pssResult, pssScoreResult.levelLabel, attemptId]
                );

            } else if (examType === 'srq29') {
                // SRQ-29 Scoring: Get options with their text (Ya/Tidak)
                const srqData = await client.query(
                    `SELECT q.id as question_id, o.id as option_id, o.text as option_text
                     FROM questions q
                     JOIN options o ON o.question_id = q.id
                     WHERE q.exam_id = $1
                     ORDER BY q.id, o.id`,
                    [examId]
                );

                // Build map: optionId -> isYes (1 or 0) - "Ya" is first option, = 1
                const optionYesMap = new Map<number, boolean>();
                
                srqData.rows.forEach((row: { option_id: number; option_text: string }) => {
                    optionYesMap.set(row.option_id, row.option_text.toLowerCase() === 'ya');
                });

                // Build answers array for SRQ scoring (29 values, 0 or 1 each)
                const sortedQuestionIds = [...new Set(srqData.rows.map((r: { question_id: number }) => r.question_id))];
                const srqAnswers: number[] = sortedQuestionIds.map((qId) => {
                    const selectedOptionId = answers[qId as number];
                    return optionYesMap.get(selectedOptionId) ? 1 : 0;
                });

                const srqScoreResult = calculateSRQ29Score(srqAnswers);
                finalScore = srqScoreResult.totalScore;
                
                // Build detailed SRQ result with answer tracking
                const srqAnswersObj: { [key: number]: string } = {};
                sortedQuestionIds.forEach((qId, idx) => {
                    srqAnswersObj[qId as number] = srqAnswers[idx] === 1 ? 'Y' : 'N';
                });

                srqResult = JSON.stringify({
                    answers: srqAnswersObj,
                    result: {
                        anxiety: srqScoreResult.categories.find(c => c.category === 'cemasDepresi')?.positive ?? false,
                        substance: srqScoreResult.categories.find(c => c.category === 'penggunaanZat')?.positive ?? false,
                        psychotic: srqScoreResult.categories.find(c => c.category === 'psikotik')?.positive ?? false,
                        ptsd: srqScoreResult.categories.find(c => c.category === 'ptsd')?.positive ?? false,
                        conclusion: getSRQConclusion(srqScoreResult),
                        resultText: srqScoreResult.outputText
                    },
                    type: 'srq29'
                });

                // Update with SRQ result
                await client.query(
                    `UPDATE exam_attempts 
                     SET score = $1, status = 'completed', end_time = NOW(), srq_result = $2, srq_conclusion = $3
                     WHERE id = $4`,
                    [finalScore, srqResult, getSRQConclusion(srqScoreResult), attemptId]
                );

            } else {
                // Standard scoring for general/MMPI exams
                const totalMarksRes = await client.query(
                    'SELECT SUM(marks) as total FROM questions WHERE exam_id = $1',
                    [examId]
                );
                const maxMarks = parseInt(totalMarksRes.rows[0]?.total || '0');

                if (maxMarks > 0) {
                    finalScore = Math.round((totalScore / maxMarks) * 100);
                }

                // Update Attempt
                await client.query(
                    'UPDATE exam_attempts SET score = $1, status = $2, end_time = NOW() WHERE id = $3',
                    [finalScore, 'completed', attemptId]
                );
            }

            await client.query('COMMIT');

            return NextResponse.json({ success: true, score: finalScore });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            return NextResponse.json({ error: 'Submission Failed' }, { status: 500 });
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// Helper function to get SRQ conclusion label
function getSRQConclusion(result: { overallStatus: string; positiveCategories: string[]; categories: Array<{category: string; positive: boolean}> }): string {
    if (result.overallStatus === 'normal') {
        return 'Normal';
    }
    
    // Use categories array which has category key names
    const hasAnxiety = result.categories.find(c => c.category === 'cemasDepresi')?.positive ?? false;
    const hasSubstance = result.categories.find(c => c.category === 'penggunaanZat')?.positive ?? false;
    const hasPsychotic = result.categories.find(c => c.category === 'psikotik')?.positive ?? false;
    const hasPtsd = result.categories.find(c => c.category === 'ptsd')?.positive ?? false;
    
    const symptoms = [];
    if (hasAnxiety) symptoms.push('Cemas/Depresi');
    if (hasSubstance) symptoms.push('Zat');
    if (hasPsychotic) symptoms.push('Psikotik');
    if (hasPtsd) symptoms.push('PTSD');
    
    if (symptoms.length === 0) {
        return 'Normal'; // Edge case - should not happen
    }
    
    if (symptoms.length === 1) {
        return `Tidak Normal - ${symptoms[0]}`;
    }
    
    return `Tidak Normal - ${symptoms.join(' + ')}`;
}
