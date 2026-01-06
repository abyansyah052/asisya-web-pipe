import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // Get all candidates with their exam stats
            const query = `
                SELECT 
                    u.id,
                    u.full_name,
                    u.email,
                    u.created_at,
                    COUNT(DISTINCT ea.id) as exam_count,
                    COUNT(DISTINCT CASE WHEN ea.status = 'completed' THEN ea.id END) as completed_count,
                    MAX(CASE WHEN ea.status = 'completed' THEN ea.end_time END) as last_exam_date
                FROM users u
                LEFT JOIN exam_attempts ea ON u.id = ea.user_id
                WHERE u.role = $1
                GROUP BY u.id
                ORDER BY u.created_at DESC
            `;
            
            const result = await client.query(query, [ROLES.CANDIDATE]);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching candidates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
