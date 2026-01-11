import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// GET - List all admin clients
export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all admin users with their organization info and stats
        const result = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.full_name,
                o.name as organization_name,
                u.created_at,
                (SELECT COUNT(*) FROM users WHERE organization_id = u.organization_id AND role = $1) as psychologist_count,
                (SELECT COUNT(*) FROM users WHERE organization_id = u.organization_id AND role = $2) as candidate_count,
                (SELECT COUNT(*) FROM exams WHERE created_by IN (
                    SELECT id FROM users WHERE organization_id = u.organization_id
                )) as exam_count
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.role = $3
            ORDER BY u.created_at DESC
        `, [ROLES.PSYCHOLOGIST, ROLES.CANDIDATE, ROLES.ADMIN]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create new admin client
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { username, email, password, fullName, organizationName } = body;

        // Validation
        if (!username || !email || !password || !organizationName) {
            return NextResponse.json({ error: 'Semua field wajib harus diisi' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
        }

        // Check if username or email already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
        }

        // Start transaction
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Create organization first
            const orgResult = await client.query(
                'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
                [organizationName]
            );
            const organizationId = orgResult.rows[0].id;

            // Create admin quota
            await client.query(
                'INSERT INTO admin_quotas (organization_id, total_exam_slots, used_exam_slots) VALUES ($1, $2, $3)',
                [organizationId, 100, 0]
            );

            // Hash password and create admin user
            const hashedPassword = await bcrypt.hash(password, 10);
            const userResult = await client.query(
                `INSERT INTO users (username, email, password_hash, full_name, role, organization_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [username, email, hashedPassword, fullName || null, ROLES.ADMIN, organizationId]
            );

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                id: userResult.rows[0].id,
                organizationId
            }, { status: 201 });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error: unknown) {
        console.error('Error creating client:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
