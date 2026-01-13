import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    // ✅ Use JWT session
    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    if (session.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    try {
        const { userId, role } = await request.json();

        // Validate role
        if (!['admin', 'candidate'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Update user role
        await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 AND role != $3',
            [role, userId, 'super_admin'] // Prevent changing super_admin role
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
