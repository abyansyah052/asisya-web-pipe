import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';
import bcrypt from 'bcryptjs';

// PUT - Update psychologist
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username, email, password, fullName } = await req.json();

        if (!username || !email) {
            return NextResponse.json({ error: 'Username dan email wajib diisi' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Check if psychologist exists and belongs to this admin's organization
            const psychResult = await client.query(
                'SELECT * FROM users WHERE id = $1 AND role = $2',
                [id, 'psychologist']
            );

            if (psychResult.rows.length === 0) {
                return NextResponse.json({ error: 'Psikolog tidak ditemukan' }, { status: 404 });
            }

            // Check ownership for non-super-admin
            if (session.role !== ROLES.SUPER_ADMIN) {
                const orgResult = await client.query(
                    'SELECT id FROM organizations WHERE admin_id = $1',
                    [session.id]
                );
                const orgId = orgResult.rows[0]?.id;

                if (psychResult.rows[0].organization_id !== orgId) {
                    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 });
                }
            }

            // Check if username or email already used by another user
            const existingUser = await client.query(
                'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
                [username, email, id]
            );

            if (existingUser.rows.length > 0) {
                return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
            }

            // Update psychologist
            if (password && password.length >= 6) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await client.query(
                    `UPDATE users SET username = $1, email = $2, password_hash = $3, full_name = $4
                     WHERE id = $5`,
                    [username, email, hashedPassword, fullName || null, id]
                );
            } else {
                await client.query(
                    `UPDATE users SET username = $1, email = $2, full_name = $3
                     WHERE id = $4`,
                    [username, email, fullName || null, id]
                );
            }

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating psychologist:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - Delete psychologist
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // Check if psychologist exists
            const psychResult = await client.query(
                'SELECT * FROM users WHERE id = $1 AND role = $2',
                [id, 'psychologist']
            );

            if (psychResult.rows.length === 0) {
                return NextResponse.json({ error: 'Psikolog tidak ditemukan' }, { status: 404 });
            }

            // Check ownership for non-super-admin
            if (session.role !== ROLES.SUPER_ADMIN) {
                const orgResult = await client.query(
                    'SELECT id FROM organizations WHERE admin_id = $1',
                    [session.id]
                );
                const orgId = orgResult.rows[0]?.id;

                if (psychResult.rows[0].organization_id !== orgId) {
                    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 });
                }
            }

            // Delete psychologist (CASCADE will handle related records)
            await client.query('DELETE FROM users WHERE id = $1', [id]);

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting psychologist:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
