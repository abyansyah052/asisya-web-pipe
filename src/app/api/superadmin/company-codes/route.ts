import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import { cookies } from 'next/headers';

// GET - List all company codes dengan optimized query (fix N+1)
export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // OPTIMIZED: Use LEFT JOIN instead of subquery for usage_count
        const result = await pool.query(`
            SELECT 
                cc.id,
                cc.code,
                cc.company_name,
                cc.organization_id,
                o.name as organization_name,
                cc.is_active,
                cc.created_at,
                COALESCE(usage.count, 0) as usage_count
            FROM company_codes cc
            LEFT JOIN organizations o ON cc.organization_id = o.id
            LEFT JOIN (
                SELECT company_code_id, COUNT(*) as count 
                FROM candidate_codes 
                WHERE company_code_id IS NOT NULL
                GROUP BY company_code_id
            ) usage ON usage.company_code_id = cc.id
            ORDER BY cc.code ASC
        `);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching company codes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create new company code
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { code, companyName, organizationId } = body;

        // Validasi
        if (!code || !companyName) {
            return NextResponse.json({ error: 'Kode dan nama perusahaan wajib diisi' }, { status: 400 });
        }

        // Validate code format (4 digits, 0000-9999)
        if (!/^\d{4}$/.test(code)) {
            return NextResponse.json({ error: 'Kode harus 4 digit angka (0000-9999)' }, { status: 400 });
        }

        // Check if code already exists
        const existingCode = await pool.query(
            'SELECT id FROM company_codes WHERE code = $1',
            [code]
        );

        if (existingCode.rows.length > 0) {
            return NextResponse.json({ error: 'Kode perusahaan sudah digunakan' }, { status: 400 });
        }

        // Insert new company code
        const result = await pool.query(
            `INSERT INTO company_codes (code, company_name, organization_id, is_active)
             VALUES ($1, $2, $3, TRUE)
             RETURNING id, code, company_name`,
            [code, companyName, organizationId || null]
        );

        return NextResponse.json({
            success: true,
            companyCode: result.rows[0]
        }, { status: 201 });
    } catch (error: unknown) {
        console.error('Error creating company code:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'Kode perusahaan sudah digunakan' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
