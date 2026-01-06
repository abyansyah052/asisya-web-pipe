import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';

// GET - List all quotas for all admins
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const client = await pool.connect();
        try {
            // Get all admins with their quotas
            const result = await client.query(`
                SELECT 
                    u.id as admin_id,
                    u.username as admin_username,
                    u.full_name as admin_name,
                    u.email as admin_email,
                    o.id as organization_id,
                    o.name as organization_name,
                    COALESCE(aq.max_psychologists, 10) as max_psychologists,
                    COALESCE(aq.max_candidates, 100) as max_candidates,
                    COALESCE(aq.max_exams, 50) as max_exams,
                    COALESCE(aq.current_psychologists, 0) as current_psychologists,
                    COALESCE(aq.current_candidates, 0) as current_candidates,
                    COALESCE(aq.current_exams, 0) as current_exams,
                    COALESCE(aq.token_balance, 0) as token_balance,
                    COALESCE(aq.tokens_used, 0) as tokens_used,
                    aq.valid_until,
                    (SELECT COUNT(*) FROM users WHERE organization_id = o.id AND role = 'psychologist') as actual_psychologists,
                    (SELECT COUNT(DISTINCT cc.candidate_id) FROM candidate_codes cc JOIN users cr ON cc.created_by = cr.id WHERE cr.organization_id = o.id AND cc.candidate_id IS NOT NULL) as actual_candidates
                FROM users u
                LEFT JOIN organizations o ON o.admin_id = u.id
                LEFT JOIN admin_quotas aq ON aq.admin_id = u.id
                WHERE u.role = 'admin'
                ORDER BY u.username ASC
            `);

            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching quotas:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create or update quota for an admin
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessSuperAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const {
            adminId,
            maxPsychologists,
            maxCandidates,
            maxExams,
            tokenBalance,
            validUntil
        } = body;

        if (!adminId) {
            return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Upsert quota
            const result = await client.query(`
                INSERT INTO admin_quotas (admin_id, max_psychologists, max_candidates, max_exams, token_balance, valid_until)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (admin_id) DO UPDATE SET
                    max_psychologists = EXCLUDED.max_psychologists,
                    max_candidates = EXCLUDED.max_candidates,
                    max_exams = EXCLUDED.max_exams,
                    token_balance = EXCLUDED.token_balance,
                    valid_until = EXCLUDED.valid_until,
                    updated_at = NOW()
                RETURNING *
            `, [
                adminId,
                maxPsychologists || 10,
                maxCandidates || 100,
                maxExams || 50,
                tokenBalance || 0,
                validUntil || null
            ]);

            return NextResponse.json({
                success: true,
                quota: result.rows[0]
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating quota:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
