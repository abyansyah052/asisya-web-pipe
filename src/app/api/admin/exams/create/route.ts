import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);
        
        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, duration_minutes, display_mode, exam_type, questions } = body;

        if (!title || !duration_minutes || !questions || questions.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Create exam with display_mode and exam_type (default to 'per_page' and 'general' if not provided)
            const examResult = await client.query(
                'INSERT INTO exams (title, description, duration_minutes, status, display_mode, exam_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [title, description || '', duration_minutes, 'published', display_mode || 'per_page', exam_type || 'general']
            );
            const examId = examResult.rows[0].id;

            // Insert questions and options
            for (const q of questions) {
                const questionResult = await client.query(
                    'INSERT INTO questions (exam_id, text, marks) VALUES ($1, $2, $3) RETURNING id',
                    [examId, q.text, q.marks]
                );
                const questionId = questionResult.rows[0].id;

                // Insert options
                for (const opt of q.options) {
                    await client.query(
                        'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
                        [questionId, opt.text, opt.isCorrect]
                    );
                }
            }

            await client.query('COMMIT');
            return NextResponse.json({ success: true, examId });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Create exam error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
