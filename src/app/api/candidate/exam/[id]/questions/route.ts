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
            // 1. Check if exam exists
            const examRes = await client.query('SELECT * FROM exams WHERE id = $1', [examId]);
            if (examRes.rows.length === 0) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
            const exam = examRes.rows[0];

            // 2. Check/Create Attempt
            const attemptRes = await client.query(
                'SELECT * FROM exam_attempts WHERE user_id = $1 AND exam_id = $2',
                [user.id, examId]
            );

            let attemptId;
            if (attemptRes.rows.length > 0) {
                const attempt = attemptRes.rows[0];
                if (attempt.status === 'completed') {
                    return NextResponse.json({ error: 'Exam already completed' }, { status: 403 });
                }
                attemptId = attempt.id;
            } else {
                // Start new attempt
                const newAttempt = await client.query(
                    'INSERT INTO exam_attempts (user_id, exam_id, start_time, status) VALUES ($1, $2, NOW(), $3) RETURNING id',
                    [user.id, examId, 'in_progress']
                );
                attemptId = newAttempt.rows[0].id;
            }

            // 3. Get Questions and Options - OPTIMIZED with Map for O(1) lookup
            const qRes = await client.query(
                'SELECT id, text, marks FROM questions WHERE exam_id = $1 AND deleted_at IS NULL ORDER BY id ASC',
                [examId]
            );
            const questions = qRes.rows;

            if (questions.length === 0) {
                return NextResponse.json({ error: 'No questions found in this exam' }, { status: 404 });
            }

            const questionIds = questions.map(q => q.id);

            // Fetch options WITHOUT is_correct (security: don't send answers to client)
            // OPTIMIZED: Use ANY($1::int[]) instead of subquery
            const optRes = await client.query(
                `SELECT id, question_id, text FROM options WHERE question_id = ANY($1::int[]) AND deleted_at IS NULL ORDER BY question_id, id`,
                [questionIds]
            );
            const options = optRes.rows;

            // OPTIMIZED: Build Map for O(1) lookup instead of O(N*M) filter
            const optionsMap = new Map<number, Array<{ id: number; text: string }>>();
            options.forEach((opt: { id: number; question_id: number; text: string }) => {
                if (!optionsMap.has(opt.question_id)) {
                    optionsMap.set(opt.question_id, []);
                }
                optionsMap.get(opt.question_id)!.push({ id: opt.id, text: opt.text });
            });

            // Map questions with options - O(N) instead of O(N*M)
            const questionsDid = questions.map(q => ({
                ...q,
                options: optionsMap.get(q.id) || []
            }));

            return NextResponse.json({
                exam: { 
                    title: exam.title, 
                    duration: exam.duration_minutes,
                    display_mode: exam.display_mode || 'per_page',
                    instructions: exam.instructions || null,
                    description: exam.description || null
                },
                attemptId,
                questions: questionsDid
            });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
