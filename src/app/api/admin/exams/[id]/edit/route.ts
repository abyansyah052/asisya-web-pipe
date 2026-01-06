import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);
        
        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: examId } = await params;
        const client = await pool.connect();

        try {
            // Get exam
            const examResult = await client.query('SELECT * FROM exams WHERE id = $1', [examId]);
            if (examResult.rows.length === 0) {
                return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
            }
            const exam = examResult.rows[0];

            // Get questions
            const questionsResult = await client.query(
                'SELECT id, text, marks FROM questions WHERE exam_id = $1 ORDER BY id',
                [examId]
            );
            const questions = questionsResult.rows;

            // Get options for all questions
            const optionsResult = await client.query(
                `SELECT id, question_id, text, is_correct FROM options 
                 WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)
                 ORDER BY question_id, id`,
                [examId]
            );

            // Map options to questions
            const questionsWithOptions = questions.map(q => ({
                ...q,
                options: optionsResult.rows.filter(o => o.question_id === q.id)
            }));

            return NextResponse.json({ exam, questions: questionsWithOptions });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get exam error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);
        
        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: examId } = await params;
        const body = await req.json();
        const { title, description, duration_minutes, status, display_mode, questions } = body;

        if (!title || !duration_minutes || !questions || questions.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Update exam with display_mode
            await client.query(
                'UPDATE exams SET title = $1, description = $2, duration_minutes = $3, status = $4, display_mode = $5 WHERE id = $6',
                [title, description || '', duration_minutes, status, display_mode || 'per_page', examId]
            );

            // Delete existing questions and options (CASCADE will handle options)
            await client.query('DELETE FROM questions WHERE exam_id = $1', [examId]);

            // Insert new questions and options
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
            return NextResponse.json({ success: true });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Update exam error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
