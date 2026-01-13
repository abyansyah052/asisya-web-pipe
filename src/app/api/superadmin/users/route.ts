import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
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

    try {
        // Get all users except super_admin (includes admin, psychologist, candidate)
        const result = await pool.query(
            `SELECT id, username, email, full_name, role, profile_completed, is_active, created_at 
             FROM users 
             WHERE role IN ($1, $2, $3)
             ORDER BY role, created_at DESC`,
            ['admin', 'psychologist', 'candidate']
        );

        return NextResponse.json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
