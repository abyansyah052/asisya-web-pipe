import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                "SELECT COUNT(*) as count FROM users WHERE role = 'candidate'"
            );
            return NextResponse.json({ count: parseInt(result.rows[0].count) });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch candidates count' }, { status: 500 });
    }
}
