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
            let query: string;
            let params: (string | number)[] = [];

            if (session.role === ROLES.SUPER_ADMIN || session.role === ROLES.ADMIN) {
                // Super admin and admin can see all candidates
                query = `SELECT COUNT(*) as count FROM users WHERE role = 'candidate'`;
            } else {
                // Psychologist sees only candidates from their codes
                query = `
                    SELECT COUNT(DISTINCT cc.candidate_id) as count 
                    FROM candidate_codes cc
                    WHERE cc.created_by = $1 AND cc.candidate_id IS NOT NULL
                `;
                params = [session.id];
            }

            const result = await client.query(query, params);
            return NextResponse.json({ count: parseInt(result.rows[0].count) || 0 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error counting candidates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
