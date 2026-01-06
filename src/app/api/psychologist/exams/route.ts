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
            // All users with psychologist access can see all exams
            // (exams table doesn't have created_by column)
            const query = `
                SELECT e.*, COUNT(q.id) as question_count 
                FROM exams e
                LEFT JOIN questions q ON e.id = q.exam_id
                GROUP BY e.id
                ORDER BY e.created_at DESC
            `;

            const result = await client.query(query);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching exams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
