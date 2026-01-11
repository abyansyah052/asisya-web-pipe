import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import { cookies } from 'next/headers';

// PUT - Update company code
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const companyCodeId = parseInt(id);
        const body = await request.json();
        const { code, companyName, organizationId, isActive } = body;

        // Check if company code exists
        const existingRecord = await pool.query(
            'SELECT id FROM company_codes WHERE id = $1',
            [companyCodeId]
        );

        if (existingRecord.rows.length === 0) {
            return NextResponse.json({ error: 'Kode perusahaan tidak ditemukan' }, { status: 404 });
        }

        // Check if this code is already used in candidate_codes
        const usageCheck = await pool.query(
            'SELECT COUNT(*) as count FROM candidate_codes WHERE company_code_id = $1',
            [companyCodeId]
        );

        const usageCount = parseInt(usageCheck.rows[0].count);

        // If code is being changed and already used, prevent it
        if (code) {
            const currentCode = await pool.query(
                'SELECT code FROM company_codes WHERE id = $1',
                [companyCodeId]
            );

            if (currentCode.rows[0].code !== code && usageCount > 0) {
                return NextResponse.json({
                    error: `Tidak dapat mengubah kode karena sudah digunakan oleh ${usageCount} kandidat`
                }, { status: 400 });
            }

            // Validate code format
            if (!/^\d{2}$/.test(code)) {
                return NextResponse.json({ error: 'Kode harus 2 digit angka (00-99)' }, { status: 400 });
            }

            // Check if new code already exists
            const duplicateCheck = await pool.query(
                'SELECT id FROM company_codes WHERE code = $1 AND id != $2',
                [code, companyCodeId]
            );

            if (duplicateCheck.rows.length > 0) {
                return NextResponse.json({ error: 'Kode perusahaan sudah digunakan' }, { status: 400 });
            }
        }

        // Update company code
        await pool.query(
            `UPDATE company_codes 
             SET code = COALESCE($1, code),
                 company_name = COALESCE($2, company_name),
                 organization_id = $3,
                 is_active = COALESCE($4, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [code, companyName, organizationId, isActive, companyCodeId]
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Error updating company code:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'Kode perusahaan sudah digunakan' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete company code
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const companyCodeId = parseInt(id);

        // Check if company code exists
        const existingRecord = await pool.query(
            'SELECT id, code FROM company_codes WHERE id = $1',
            [companyCodeId]
        );

        if (existingRecord.rows.length === 0) {
            return NextResponse.json({ error: 'Kode perusahaan tidak ditemukan' }, { status: 404 });
        }

        // Prevent deleting default code '00'
        if (existingRecord.rows[0].code === '00') {
            return NextResponse.json({ error: 'Tidak dapat menghapus kode default' }, { status: 400 });
        }

        // Check if this code is already used in candidate_codes
        const usageCheck = await pool.query(
            'SELECT COUNT(*) as count FROM candidate_codes WHERE company_code_id = $1',
            [companyCodeId]
        );

        const usageCount = parseInt(usageCheck.rows[0].count);

        if (usageCount > 0) {
            return NextResponse.json({
                error: `Tidak dapat menghapus kode karena sudah digunakan oleh ${usageCount} kandidat`
            }, { status: 400 });
        }

        // Delete the company code
        await pool.query(
            'DELETE FROM company_codes WHERE id = $1',
            [companyCodeId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting company code:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
