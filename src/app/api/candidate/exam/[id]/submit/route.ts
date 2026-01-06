import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { submitRateLimiter, checkRateLimit } from '@/lib/ratelimit';
import { validateSubmitExam } from '@/lib/validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // ✅ Get and validate user session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ✅ RATE LIMITING: Fail-closed approach
        const rateLimit = await checkRateLimit(submitRateLimiter, `submit:${user.id}`);
        
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

            questionsData.rows.forEach(row => {
                marksMap.set(row.id, row.marks);
                correctnessMap.set(row.option_id, row.is_correct);
            });

            let totalScore = 0;
            let totalMax = 0;

            // ✅ TRUE BULK INSERT: Build single query with multiple VALUES
            const insertValues: string[] = [];
            const insertParams: any[] = [attemptId];

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
                    INSERT INTO answers (attempt_id, question_id, selected_option_id)
                    VALUES ${insertValues.join(', ')}
                    ON CONFLICT (attempt_id, question_id)
                    DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id
                `;
                await client.query(bulkInsertQuery, insertParams);
            }

            // Calculate final score normalized to 100
            const totalMarksRes = await client.query(
                'SELECT SUM(marks) as total FROM questions WHERE exam_id = $1',
                [examId]
            );
            const maxMarks = parseInt(totalMarksRes.rows[0]?.total || '0');

            let finalScore = 0;
            if (maxMarks > 0) {
                finalScore = Math.round((totalScore / maxMarks) * 100);
            }

            // Update Attempt
            await client.query(
                'UPDATE exam_attempts SET score = $1, status = $2, end_time = NOW() WHERE id = $3',
                [finalScore, 'completed', attemptId]
            );

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
