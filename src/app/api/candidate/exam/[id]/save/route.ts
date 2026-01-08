import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = await params;

    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        
        const user = await getSession(sessionCookie?.value);
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { attemptId, answers } = await req.json();

        if (!attemptId || !answers) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            // Verify the attempt belongs to this user and is still in progress
            const attemptRes = await client.query(
                'SELECT id FROM exam_attempts WHERE id = $1 AND user_id = $2 AND exam_id = $3 AND status = $4',
                [attemptId, user.id, examId, 'in_progress']
            );

            if (attemptRes.rows.length === 0) {
                return NextResponse.json({ error: 'Invalid or completed attempt' }, { status: 403 });
            }

            // Save/Update answers using UPSERT
            for (const [questionId, optionId] of Object.entries(answers)) {
                await client.query(
                    `INSERT INTO exam_answers (attempt_id, question_id, selected_option_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (attempt_id, question_id)
                     DO UPDATE SET selected_option_id = $3, answered_at = NOW()`,
                    [attemptId, parseInt(questionId), optionId]
                );
            }

            return NextResponse.json({ success: true, savedCount: Object.keys(answers).length });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Save answers error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
