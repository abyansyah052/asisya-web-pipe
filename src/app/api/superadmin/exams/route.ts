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
        const result = await pool.query(
            'SELECT id, title, duration_minutes, created_at FROM exams ORDER BY created_at DESC'
        );

        return NextResponse.json({ exams: result.rows });
    } catch (error) {
        console.error('Error fetching exams:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}