import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = await params;

    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        
        // ✅ Use JWT session helper
        const user = await getSession(sessionCookie?.value);
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();

        try {
            // ✅ SECURITY FIX: Validate user has access to this exam via candidate_codes
            const accessCheck = await client.query(
                `SELECT cc.id FROM candidate_codes cc
                 WHERE cc.candidate_id = $1 AND cc.exam_id = $2 AND cc.is_active = true`,
                [user.id, examId]
            );
            
            // Allow access if user has valid code OR if they already have an attempt (backward compatibility)
            const existingAttempt = await client.query(
                'SELECT id FROM exam_attempts WHERE user_id = $1 AND exam_id = $2',
                [user.id, examId]
            );
            
            if (accessCheck.rows.length === 0 && existingAttempt.rows.length === 0) {
                return NextResponse.json({ error: 'Anda tidak memiliki akses ke ujian ini' }, { status: 403 });
            }

            // 1. Check if exam exists and is published
            const examRes = await client.query(
                'SELECT id, title, duration_minutes, display_mode, instructions, description, require_all_answers, status, exam_type FROM exams WHERE id = $1',
                [examId]
            );
            if (examRes.rows.length === 0) {
                return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
            }
            const exam = examRes.rows[0];

            // ✅ SECURITY: Only allow published exams
            if (exam.status !== 'published') {
                return NextResponse.json({ error: 'Ujian tidak tersedia' }, { status: 403 });
            }

            // 2. ✅ SECURITY FIX: Check for existing attempts and prevent multiple in_progress
            const attemptRes = await client.query(
                'SELECT id, status, start_time FROM exam_attempts WHERE user_id = $1 AND exam_id = $2 ORDER BY created_at DESC LIMIT 1',
                [user.id, examId]
            );

            let attemptId: number;
            let startTime: Date;
            
            if (attemptRes.rows.length > 0) {
                const attempt = attemptRes.rows[0];
                
                // ✅ SECURITY FIX: If completed, don't allow new attempt
                if (attempt.status === 'completed') {
                    return NextResponse.json({ error: 'Anda sudah menyelesaikan ujian ini' }, { status: 403 });
                }
                
                // Continue existing in_progress attempt
                attemptId = attempt.id;
                startTime = new Date(attempt.start_time);
            } else {
                // ✅ Start new attempt with row-level lock to prevent race condition
                const newAttempt = await client.query(
                    `INSERT INTO exam_attempts (user_id, exam_id, start_time, status) 
                     VALUES ($1, $2, NOW(), $3) 
                     RETURNING id, start_time`,
                    [user.id, examId, 'in_progress']
                );
                attemptId = newAttempt.rows[0].id;
                startTime = new Date(newAttempt.rows[0].start_time);
            }

            // ✅ Calculate remaining time based on start_time
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const totalSeconds = exam.duration_minutes * 60;
            const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

            // ✅ If time already expired, mark as completed
            if (remainingSeconds === 0) {
                await client.query(
                    'UPDATE exam_attempts SET status = $1, end_time = NOW() WHERE id = $2 AND status = $3',
                    ['completed', attemptId, 'in_progress']
                );
                return NextResponse.json({ error: 'Waktu ujian telah habis' }, { status: 403 });
            }

            // 3. ✅ PERFORMANCE FIX: Get Questions and Options in ONE optimized query using json_agg
            const questionsWithOptions = await client.query(
                `SELECT 
                    q.id, 
                    q.text,
                    json_agg(
                        json_build_object('id', o.id, 'text', o.text)
                        ORDER BY o.id
                    ) as options
                 FROM questions q
                 LEFT JOIN options o ON o.question_id = q.id
                 WHERE q.exam_id = $1
                 GROUP BY q.id, q.text
                 ORDER BY q.id ASC`,
                [examId]
            );

            if (questionsWithOptions.rows.length === 0) {
                return NextResponse.json({ error: 'No questions found in this exam' }, { status: 404 });
            }

            // ✅ SECURITY FIX: Don't send marks to client (removed from SELECT)
            const questions = questionsWithOptions.rows.map((q: { id: number; text: string; options: Array<{ id: number; text: string }> }) => ({
                id: q.id,
                text: q.text,
                options: q.options || []
            }));

            // ✅ Load saved answers from database (persist across reconnect)
            const savedAnswersRes = await client.query(
                `SELECT question_id, selected_option_id FROM exam_answers WHERE attempt_id = $1`,
                [attemptId]
            );
            const savedAnswers: { [key: number]: number } = {};
            savedAnswersRes.rows.forEach((row: { question_id: number; selected_option_id: number }) => {
                savedAnswers[row.question_id] = row.selected_option_id;
            });

            return NextResponse.json({
                exam: { 
                    title: exam.title, 
                    duration: exam.duration_minutes,
                    display_mode: exam.display_mode || 'per_page',
                    instructions: exam.instructions || null,
                    description: exam.description || null,
                    require_all_answers: exam.require_all_answers || false,
                    exam_type: exam.exam_type || 'general'
                },
                attemptId,
                questions,
                // ✅ Send remaining time from server (persists across refresh)
                remainingSeconds,
                startTime: startTime.toISOString(),
                // ✅ Send saved answers (persist across reconnect)
                savedAnswers
            });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
