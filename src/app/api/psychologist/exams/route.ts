import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET() {
    try {
        // Check authentication
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // Get all exams with question count and assignment info for current user
            const query = `
                SELECT 
                    e.*, 
                    COUNT(DISTINCT q.id) as question_count,
                    COUNT(DISTINCT cg.candidate_id) as assigned_candidates,
                    CASE WHEN COUNT(DISTINCT cg.candidate_id) > 0 THEN true ELSE false END as is_assigned_to_me
                FROM exams e
                LEFT JOIN questions q ON e.id = q.exam_id
                LEFT JOIN candidate_groups cg ON e.id = cg.exam_id AND cg.assessor_id = $1
                GROUP BY e.id
                ORDER BY e.created_at DESC
            `;

            const result = await client.query(query, [session.id]);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching exams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
