import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';
import bcrypt from 'bcryptjs';

// GET - List all psychologists under this admin
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
            let query: string;
            let params: (string | number)[] = [];

            if (session.role === ROLES.SUPER_ADMIN) {
                // Super admin sees all psychologists
                query = `
                    SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at,
                           COUNT(DISTINCT cc.id) as exam_count,
                           COUNT(DISTINCT cc.candidate_id) as candidate_count
                    FROM users u
                    LEFT JOIN candidate_codes cc ON cc.created_by = u.id
                    WHERE u.role = 'psychologist'
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                `;
            } else {
                // Admin sees psychologists in their org OR unassigned psychologists (for approval)
                let orgId = null;
                try {
                    const orgResult = await client.query(
                        'SELECT id FROM organizations WHERE admin_id = $1',
                        [session.id]
                    );
                    orgId = orgResult.rows[0]?.id;
                } catch (e) {
                    console.log('Organizations query failed:', e);
                }

                if (orgId) {
                    query = `
                        SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at,
                               COUNT(DISTINCT cc.id) as exam_count,
                               COUNT(DISTINCT cc.candidate_id) as candidate_count
                        FROM users u
                        LEFT JOIN candidate_codes cc ON cc.created_by = u.id
                        WHERE u.role = 'psychologist' AND (u.organization_id = $1 OR u.organization_id IS NULL)
                        GROUP BY u.id
                        ORDER BY u.is_active DESC, u.created_at DESC
                    `;
                    params = [orgId];
                } else {
                    // No organization yet, show all psychologists
                    query = `
                        SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at,
                               COUNT(DISTINCT cc.id) as exam_count,
                               COUNT(DISTINCT cc.candidate_id) as candidate_count
                        FROM users u
                        LEFT JOIN candidate_codes cc ON cc.created_by = u.id
                        WHERE u.role = 'psychologist'
                        GROUP BY u.id
                        ORDER BY u.created_at DESC
                    `;
                }
            }

            const result = await client.query(query, params);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching psychologists:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Create new psychologist
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username, email, password, fullName } = await req.json();

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'Username, email, dan password wajib diisi' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Check if username or email already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 400 });
            }

            // Get organization ID
            let orgId = null;
            if (session.role !== ROLES.SUPER_ADMIN) {
                try {
                    const orgResult = await client.query(
                        'SELECT id FROM organizations WHERE admin_id = $1',
                        [session.id]
                    );
                    orgId = orgResult.rows[0]?.id || null;
                } catch (e) {
                    console.log('Organizations query failed:', e);
                }
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create psychologist
            const result = await client.query(
                `INSERT INTO users (username, email, password_hash, full_name, role, organization_id, is_active, created_at)
                 VALUES ($1, $2, $3, $4, 'psychologist', $5, true, NOW())
                 RETURNING id, username, email, full_name, created_at`,
                [username, email, hashedPassword, fullName || null, orgId]
            );

            return NextResponse.json({
                success: true,
                psychologist: result.rows[0]
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creating psychologist:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
