import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { attemptId, answers, score, category } = body;

        if (!attemptId || !answers || score === undefined || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { id: examId } = await params;

            // Validate attempt ownership and status
            const attemptValidation = await client.query(
                `SELECT ea.id, ea.status, ea.user_id, e.exam_type
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

            if (attempt.user_id !== user.id) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }

            if (attempt.exam_type !== 'pss') {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Bukan ujian PSS' }, { status: 400 });
            }

            if (attempt.status === 'completed') {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Ujian sudah diselesaikan' }, { status: 403 });
            }

            // Store PSS result in exam_answers with special format
            // We'll store the raw answers and the calculated result
            const resultData = JSON.stringify({
                answers,
                score,
                category,
                type: 'pss'
            });

            // Update attempt with PSS-specific score (the actual PSS score, not percentage)
            await client.query(
                `UPDATE exam_attempts 
                 SET score = $1, status = 'completed', end_time = NOW(), 
                     pss_result = $2, pss_category = $3
                 WHERE id = $4`,
                [score, resultData, category, attemptId]
            );

            await client.query('COMMIT');

            return NextResponse.json({ success: true, score, category });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            return NextResponse.json({ error: 'Submission Failed' }, { status: 500 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
