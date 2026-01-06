import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import bcrypt from 'bcryptjs';

// PUT - Update client
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const clientId = parseInt(id);
        const body = await request.json();
        const { username, email, password, fullName, organizationName } = body;

        // Validation
        if (!username || !email || !organizationName) {
            return NextResponse.json({ error: 'Field wajib harus diisi' }, { status: 400 });
        }

        // Check if user exists and is admin
        const existingUser = await pool.query(
            'SELECT id, organization_id FROM users WHERE id = $1 AND role = $2',
            [clientId, ROLES.ADMIN]
        );

        if (existingUser.rows.length === 0) {
            return NextResponse.json({ error: 'Client tidak ditemukan' }, { status: 404 });
        }

        const organizationId = existingUser.rows[0].organization_id;

        // Check if username or email already used by another user
        const duplicateCheck = await pool.query(
            'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
            [username, email, clientId]
        );

        if (duplicateCheck.rows.length > 0) {
            return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
        }

        // Start transaction
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Update organization name
            if (organizationId) {
                await client.query(
                    'UPDATE organizations SET name = $1 WHERE id = $2',
                    [organizationName, organizationId]
                );
            }

            // Update user
            if (password && password.length > 0) {
                if (password.length < 6) {
                    await client.query('ROLLBACK');
                    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                await client.query(
                    `UPDATE users SET username = $1, email = $2, password_hash = $3, full_name = $4
                     WHERE id = $5`,
                    [username, email, hashedPassword, fullName || null, clientId]
                );
            } else {
                await client.query(
                    `UPDATE users SET username = $1, email = $2, full_name = $3
                     WHERE id = $4`,
                    [username, email, fullName || null, clientId]
                );
            }

            await client.query('COMMIT');

            return NextResponse.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error: unknown) {
        console.error('Error updating client:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete client
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const clientId = parseInt(id);

        // Get client and organization info
        const clientInfo = await pool.query(
            'SELECT id, organization_id FROM users WHERE id = $1 AND role = $2',
            [clientId, ROLES.ADMIN]
        );

        if (clientInfo.rows.length === 0) {
            return NextResponse.json({ error: 'Client tidak ditemukan' }, { status: 404 });
        }

        const organizationId = clientInfo.rows[0].organization_id;

        // Start transaction
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Delete all candidate codes for this organization's users
            await client.query(`
                DELETE FROM candidate_codes WHERE created_by IN (
                    SELECT id FROM users WHERE organization_id = $1
                )
            `, [organizationId]);

            // Delete all exam answers for candidates in this org
            await client.query(`
                DELETE FROM exam_answers WHERE candidate_id IN (
                    SELECT id FROM users WHERE organization_id = $1
                )
            `, [organizationId]);

            // Delete all exam results for this org
            await client.query(`
                DELETE FROM exam_results WHERE candidate_id IN (
                    SELECT id FROM users WHERE organization_id = $1
                )
            `, [organizationId]);

            // Delete all exam questions for exams created by this org's users
            await client.query(`
                DELETE FROM exam_questions WHERE exam_id IN (
                    SELECT id FROM exams WHERE created_by IN (
                        SELECT id FROM users WHERE organization_id = $1
                    )
                )
            `, [organizationId]);

            // Delete all exams created by this org's users
            await client.query(`
                DELETE FROM exams WHERE created_by IN (
                    SELECT id FROM users WHERE organization_id = $1
                )
            `, [organizationId]);

            // Delete all users in this organization
            await client.query(
                'DELETE FROM users WHERE organization_id = $1',
                [organizationId]
            );

            // Delete admin quota
            await client.query(
                'DELETE FROM admin_quotas WHERE organization_id = $1',
                [organizationId]
            );

            // Delete organization
            await client.query(
                'DELETE FROM organizations WHERE id = $1',
                [organizationId]
            );

            await client.query('COMMIT');

            return NextResponse.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
