import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');

        // ✅ Use JWT session helper
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        const client = await pool.connect();
        try {
            // ✅ OPTIMIZED: Single CTE query instead of 4 separate queries
            const dashboardQuery = `
                WITH user_info AS (
                    SELECT id, username, email, full_name FROM users WHERE id = $1
                ),
                in_progress_exam AS (
                    SELECT ea.id as attempt_id, ea.exam_id, e.title
                    FROM exam_attempts ea
                    JOIN exams e ON ea.exam_id = e.id
                    WHERE ea.user_id = $1 AND ea.status = 'in_progress'
                    LIMIT 1
                ),
                completed_exams AS (
                    SELECT ea.id as attempt_id, e.title, ea.end_time as date, ea.score, ea.status
                    FROM exam_attempts ea
                    JOIN exams e ON ea.exam_id = e.id
                    WHERE ea.user_id = $1 AND ea.status = 'completed'
                    ORDER BY ea.end_time DESC
                ),
                available_exams AS (
                    SELECT e.*
                    FROM exams e
                    WHERE e.status = 'published'
                    AND e.id NOT IN (
                        SELECT exam_id FROM exam_attempts 
                        WHERE user_id = $1 AND status = 'completed'
                    )
                    ORDER BY e.created_at DESC
                )
                SELECT 
                    (SELECT row_to_json(user_info.*) FROM user_info) as user,
                    (SELECT row_to_json(in_progress_exam.*) FROM in_progress_exam) as in_progress,
                    COALESCE((SELECT json_agg(completed_exams.*) FROM completed_exams), '[]'::json) as completed,
                    COALESCE((SELECT json_agg(available_exams.*) FROM available_exams), '[]'::json) as todo
            `;

            const result = await client.query(dashboardQuery, [userId]);
            const data = result.rows[0];

            return NextResponse.json({
                user: data.user,
                inProgress: data.in_progress,
                completed: data.completed,
                todo: data.todo
            });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
