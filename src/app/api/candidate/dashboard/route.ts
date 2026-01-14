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
            // ✅ OPTIMIZED: Single CTE query with specific columns (no SELECT *)
            const dashboardQuery = `
                WITH user_info AS (
                    SELECT u.id, u.username, u.email, 
                           COALESCE(
                               cc.metadata->>'candidate_name',
                               cc.metadata->>'name'
                           ) as full_name
                    FROM users u
                    LEFT JOIN candidate_codes cc ON u.id = cc.candidate_id
                    WHERE u.id = $1
                    ORDER BY cc.used_at DESC NULLS LAST
                    LIMIT 1
                ),
                in_progress_exam AS (
                    SELECT ea.id as attempt_id, ea.exam_id, e.title
                    FROM exam_attempts ea
                    JOIN exams e ON ea.exam_id = e.id
                    WHERE ea.user_id = $1 AND ea.status = 'in_progress'
                    LIMIT 1
                ),
                completed_exams AS (
                    SELECT ea.id as attempt_id, e.title, ea.end_time as date, 
                           -- ✅ PSS/SRQ: Hide score from candidates, only show completion status
                           CASE WHEN e.exam_type IN ('pss', 'srq29') THEN NULL ELSE ea.score END as score,
                           ea.status,
                           e.exam_type
                    FROM exam_attempts ea
                    JOIN exams e ON ea.exam_id = e.id
                    WHERE ea.user_id = $1 AND ea.status = 'completed'
                    ORDER BY ea.end_time DESC
                ),
                available_exams AS (
                    SELECT e.id, e.title, e.description, e.duration_minutes, e.status, e.exam_type, e.instructions
                    FROM exams e
                    WHERE e.status = 'published'
                    AND NOT EXISTS (
                        SELECT 1 FROM exam_attempts ea 
                        WHERE ea.exam_id = e.id AND ea.user_id = $1 AND ea.status = 'completed'
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
