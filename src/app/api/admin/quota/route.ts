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
            // Get quota for this admin
            const quotaResult = await client.query(
                `SELECT * FROM admin_quotas WHERE admin_id = $1`,
                [session.id]
            );

            // Get actual usage counts
            let orgId = null;
            try {
                const orgResult = await client.query(
                    'SELECT id FROM organizations WHERE admin_id = $1',
                    [session.id]
                );
                orgId = orgResult.rows[0]?.id;
            } catch (e) {
                console.log('Organizations query error:', e);
            }

            let usedPsychologists = 0;
            let usedCandidates = 0;
            let usedExams = 0;

            if (orgId) {
                const [psychRes, candRes, examRes] = await Promise.all([
                    client.query(`SELECT COUNT(*) FROM users WHERE role = 'psychologist' AND organization_id = $1`, [orgId]),
                    client.query(`SELECT COUNT(DISTINCT cc.candidate_id) FROM candidate_codes cc JOIN users u ON cc.created_by = u.id WHERE u.organization_id = $1 AND cc.candidate_id IS NOT NULL`, [orgId]),
                    client.query(`SELECT COUNT(*) FROM exams`)
                ]);
                usedPsychologists = parseInt(psychRes.rows[0].count);
                usedCandidates = parseInt(candRes.rows[0].count);
                usedExams = parseInt(examRes.rows[0].count);
            }

            if (quotaResult.rows.length === 0) {
                // Return default quota if not set
                return NextResponse.json({
                    maxPsychologists: 999,
                    maxCandidates: 999,
                    maxExams: 999,
                    usedPsychologists,
                    usedCandidates,
                    usedExams,
                    tokenBalance: 0,
                    tokensUsed: 0,
                    validUntil: null
                });
            }

            const quota = quotaResult.rows[0];

            return NextResponse.json({
                maxPsychologists: quota.max_psychologists,
                maxCandidates: quota.max_candidates,
                maxExams: quota.max_exams,
                usedPsychologists,
                usedCandidates,
                usedExams,
                tokenBalance: quota.token_balance || 0,
                tokensUsed: quota.tokens_used || 0,
                validUntil: quota.valid_until
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching quota:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
