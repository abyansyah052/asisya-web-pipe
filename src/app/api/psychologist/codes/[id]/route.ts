import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

// DELETE - Deactivate a code
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // Check if code exists and belongs to this user (or user is admin/super_admin)
            const codeResult = await client.query(
                'SELECT * FROM candidate_codes WHERE id = $1',
                [id]
            );

            if (codeResult.rows.length === 0) {
                return NextResponse.json({ error: 'Kode tidak ditemukan' }, { status: 404 });
            }

            const code = codeResult.rows[0];

            // Only allow deactivation if:
            // 1. User is super_admin/admin, OR
            // 2. User created this code
            if (session.role !== ROLES.SUPER_ADMIN && 
                session.role !== ROLES.ADMIN && 
                code.created_by !== session.id) {
                return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 });
            }

            // Deactivate the code
            await client.query(
                'UPDATE candidate_codes SET is_active = false WHERE id = $1',
                [id]
            );

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deactivating code:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
