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
            // ✅ SECURITY FIX: Verify attempt belongs to this user AND check time limit
            const attemptRes = await client.query(
                `SELECT ea.id, ea.start_time, e.duration_minutes 
                 FROM exam_attempts ea
                 JOIN exams e ON ea.exam_id = e.id
                 WHERE ea.id = $1 AND ea.user_id = $2 AND ea.exam_id = $3 AND ea.status = $4`,
                [attemptId, user.id, examId, 'in_progress']
            );

            if (attemptRes.rows.length === 0) {
                return NextResponse.json({ error: 'Invalid or completed attempt' }, { status: 403 });
            }

            // ✅ SECURITY FIX: Validate time limit (add 60s grace period for network latency)
            const attempt = attemptRes.rows[0];
            const startTime = new Date(attempt.start_time);
            const now = new Date();
            const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
            const gracePeriodMinutes = 1; // 60 seconds grace period
            
            if (elapsedMinutes > attempt.duration_minutes + gracePeriodMinutes) {
                // Auto-complete the attempt if time exceeded
                await client.query(
                    'UPDATE exam_attempts SET status = $1, end_time = NOW() WHERE id = $2',
                    ['completed', attemptId]
                );
                return NextResponse.json({ error: 'Waktu ujian telah habis' }, { status: 403 });
            }

            // ✅ PERFORMANCE FIX: Bulk Insert instead of N+1 queries
            const questionIds = Object.keys(answers).map(Number);
            
            if (questionIds.length > 0) {
                const insertValues: string[] = [];
                const insertParams: (number | string)[] = [attemptId];

                questionIds.forEach((qId, index) => {
                    const selectedOptId = answers[qId];
                    const paramOffset = index * 2 + 2;
                    insertValues.push(`($1, $${paramOffset}, $${paramOffset + 1})`);
                    insertParams.push(qId, selectedOptId);
                });

                const bulkInsertQuery = `
                    INSERT INTO exam_answers (attempt_id, question_id, selected_option_id)
                    VALUES ${insertValues.join(', ')}
                    ON CONFLICT (attempt_id, question_id)
                    DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id, answered_at = NOW()
                `;
                
                await client.query(bulkInsertQuery, insertParams);
            }

            return NextResponse.json({ success: true, savedCount: questionIds.length });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Save answers error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
