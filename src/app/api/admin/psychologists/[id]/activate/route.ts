import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// PATCH - Toggle psychologist activation
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const psychologistId = parseInt(params.id);
        const body = await request.json();
        const { is_active } = body;

        if (typeof is_active !== 'boolean') {
            return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Verify the psychologist exists and can be managed by this admin
            const query = 'SELECT id, organization_id FROM users WHERE id = $1 AND role = $2';
            const psychResult = await client.query(query, [psychologistId, 'psychologist']);

            if (psychResult.rows.length === 0) {
                return NextResponse.json({ error: 'Psikolog tidak ditemukan' }, { status: 404 });
            }

            // If admin (not super_admin), verify org ownership
            if (session.role === 'admin') {
                const orgResult = await client.query(
                    'SELECT id FROM organizations WHERE admin_id = $1',
                    [session.id]
                );
                const orgId = orgResult.rows[0]?.id;
                const psychOrgId = psychResult.rows[0].organization_id;

                // Allow if psych belongs to admin's org OR is unassigned
                if (psychOrgId && psychOrgId !== orgId) {
                    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 });
                }

                // If activating an unassigned psychologist, assign to this admin's org
                if (is_active && !psychOrgId && orgId) {
                    await client.query(
                        'UPDATE users SET is_active = $1, organization_id = $2 WHERE id = $3',
                        [is_active, orgId, psychologistId]
                    );
                } else {
                    await client.query(
                        'UPDATE users SET is_active = $1 WHERE id = $2',
                        [is_active, psychologistId]
                    );
                }
            } else {
                // Super admin can activate anyone
                await client.query(
                    'UPDATE users SET is_active = $1 WHERE id = $2',
                    [is_active, psychologistId]
                );
            }

            return NextResponse.json({
                success: true,
                message: is_active ? 'Psikolog berhasil diaktifkan' : 'Psikolog berhasil dinonaktifkan'
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error toggling psychologist activation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
