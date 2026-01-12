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
        const { title, description, duration_minutes, status, display_mode, questions, thumbnail, require_all_answers } = body;

        if (!title || !duration_minutes || !questions || questions.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Update exam with display_mode, thumbnail, and require_all_answers
            await client.query(
                'UPDATE exams SET title = $1, description = $2, duration_minutes = $3, status = $4, display_mode = $5, thumbnail = $6, require_all_answers = $7 WHERE id = $8',
                [title, description || '', duration_minutes, status, display_mode || 'per_page', thumbnail || null, require_all_answers || false, examId]
            );

            // ✅ FIX: Preserve question IDs to avoid orphaning exam_answers
            // Get existing question IDs
            const existingQuestionsResult = await client.query(
                'SELECT id FROM questions WHERE exam_id = $1',
                [examId]
            );
            const existingQuestionIds = new Set(existingQuestionsResult.rows.map((q: { id: number }) => q.id));
            const newQuestionIds = new Set(questions.filter((q: { id?: number }) => q.id).map((q: { id: number }) => q.id));

            // Delete questions that are no longer in the list (and their options via CASCADE)
            const questionsToDelete = [...existingQuestionIds].filter(id => !newQuestionIds.has(id));
            if (questionsToDelete.length > 0) {
                await client.query(
                    'DELETE FROM questions WHERE id = ANY($1::int[])',
                    [questionsToDelete]
                );
            }

            // Update or insert questions
            for (const q of questions) {
                let questionId = q.id;

                if (q.id && existingQuestionIds.has(q.id)) {
                    // Update existing question
                    await client.query(
                        'UPDATE questions SET text = $1, marks = $2 WHERE id = $3',
                        [q.text, q.marks, q.id]
                    );

                    // ✅ FIX: Preserve option IDs to avoid orphaning exam_answers
                    // Get existing option IDs for this question
                    const existingOptionsResult = await client.query(
                        'SELECT id, text FROM options WHERE question_id = $1 ORDER BY id',
                        [q.id]
                    );
                    const existingOptions = existingOptionsResult.rows;
                    const existingOptionIds = new Set(existingOptions.map((o: { id: number }) => o.id));
                    
                    // Track which existing options to keep
                    const optionIdsToKeep = new Set<number>();
                    
                    for (const opt of q.options) {
                        if (opt.id && existingOptionIds.has(opt.id)) {
                            // Update existing option
                            await client.query(
                                'UPDATE options SET text = $1, is_correct = $2 WHERE id = $3',
                                [opt.text, opt.isCorrect, opt.id]
                            );
                            optionIdsToKeep.add(opt.id);
                        } else {
                            // Insert new option
                            await client.query(
                                'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
                                [q.id, opt.text, opt.isCorrect]
                            );
                        }
                    }
                    
                    // Delete options that are no longer in the list
                    const optionsToDelete = existingOptions
                        .filter((o: { id: number }) => !optionIdsToKeep.has(o.id))
                        .map((o: { id: number }) => o.id);
                    if (optionsToDelete.length > 0) {
                        await client.query(
                            'DELETE FROM options WHERE id = ANY($1::int[])',
                            [optionsToDelete]
                        );
                    }
                } else {
                    // Insert new question
                    const questionResult = await client.query(
                        'INSERT INTO questions (exam_id, text, marks) VALUES ($1, $2, $3) RETURNING id',
                        [examId, q.text, q.marks]
                    );
                    questionId = questionResult.rows[0].id;

                    // Insert options for new question
                    for (const opt of q.options) {
                        await client.query(
                            'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
                            [questionId, opt.text, opt.isCorrect]
                        );
                    }
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
