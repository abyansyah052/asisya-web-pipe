import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin or admin
    if (session.role !== 'super_admin' && session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const userId = parseInt(params.id);

    try {
        // Get user basic info
        const userResult = await pool.query(
            'SELECT id, username, email, full_name, created_at, profile_completed FROM users WHERE id = $1 AND role = $2',
            [userId, 'candidate']
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 });
        }

        const user = userResult.rows[0];

        // Get profile data if completed
        let profile = null;
        if (user.profile_completed) {
            const profileResult = await pool.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [userId]
            );
            profile = profileResult.rows[0] || null;
        }

        return NextResponse.json({
            ...user,
            profile
        });
    } catch (error) {
        console.error('Error fetching candidate detail:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Toggle user activation status
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super_admin can toggle activation
    if (session.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const params = await context.params;
    const userId = parseInt(params.id);
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 });
    }

    try {
        // Update user activation status
        const result = await pool.query(
            'UPDATE users SET is_active = $1 WHERE id = $2 AND role != $3 RETURNING id, username, is_active',
            [is_active, userId, 'super_admin']
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User tidak ditemukan atau tidak bisa diubah' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user activation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
