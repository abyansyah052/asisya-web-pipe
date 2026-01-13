import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// GET - List all codes (admin only)
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // ✅ Only show active codes (soft delete filter)
            // Check both 'name' and 'candidate_name' in metadata for compatibility
            const query = `
                SELECT cc.id, cc.code, cc.created_at, cc.expires_at, cc.used_at,
                       cc.is_active, cc.current_uses, cc.max_uses,
                       COALESCE(cc.metadata->>'candidate_name', cc.metadata->>'name') as candidate_name,
                       e.title as exam_title,
                       u.id as used_by_user_id,
                       u.email as used_by_email
                FROM candidate_codes cc
                LEFT JOIN exams e ON cc.exam_id = e.id
                LEFT JOIN users u ON cc.candidate_id = u.id
                WHERE cc.is_active = true
                ORDER BY cc.created_at DESC
            `;

            const result = await client.query(query);
            return NextResponse.json({ codes: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching codes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
