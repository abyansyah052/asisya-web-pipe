import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
    request: Request,
    context: { params: Promise<{ examId: string }> }
) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    if (session.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const params = await context.params;
    const examId = parseInt(params.examId);

    try {
        // Get all candidates (tidak perlu profile_completed=true)
        const candidatesResult = await pool.query(
            `SELECT u.id, u.full_name, u.email, COALESCE(up.nomor_peserta, 0) as nomor_peserta 
             FROM users u
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE u.role = $1
             ORDER BY COALESCE(up.nomor_peserta, 999999) ASC, u.full_name ASC`,
            ['candidate']
        );

        // Get existing groups for this exam (not soft deleted)
        const groupsResult = await pool.query(
            `SELECT admin_id, candidate_ids 
             FROM exam_assessors 
             WHERE exam_id = $1 AND deleted_at IS NULL`,
            [examId]
        );

        const groups = groupsResult.rows.map(row => ({
            adminId: row.admin_id,
            candidates: row.candidate_ids || []
        }));

        return NextResponse.json({
            candidates: candidatesResult.rows,
            groups
        });
    } catch (error) {
        console.error('Error fetching exam grouping data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}