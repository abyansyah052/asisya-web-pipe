import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

// Generate random code like XXXX-XXXX-XXXX
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like 0, O, I, 1
    let code = '';
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// GET - List all codes created by this psychologist
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
                // Super admin and admin can see all codes
                query = `
                    SELECT cc.*, e.title as exam_title,
                           cc.metadata->>'name' as candidate_name
                    FROM candidate_codes cc
                    LEFT JOIN exams e ON cc.exam_id = e.id
                    ORDER BY cc.created_at DESC
                `;
            } else {
                // Psychologist sees only their codes
                query = `
                    SELECT cc.*, e.title as exam_title,
                           cc.metadata->>'name' as candidate_name
                    FROM candidate_codes cc
                    LEFT JOIN exams e ON cc.exam_id = e.id
                    WHERE cc.created_by = $1
                    ORDER BY cc.created_at DESC
                `;
                params = [session.id];
            }

            const result = await client.query(query, params);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching codes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
