import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        console.log('Stats API - Session:', session);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // Get organization info if exists
            let organization = null;
            let orgId = null;

            try {
                const orgResult = await client.query(
                    `SELECT * FROM organizations WHERE admin_id = $1`,
                    [session.id]
                );
                console.log('Stats API - Org result:', orgResult.rows);
                if (orgResult.rows.length > 0) {
                    organization = orgResult.rows[0];
                    orgId = organization.id;
                }
            } catch (e) {
                console.log('Organizations table query error:', e);
            }

            console.log('Stats API - OrgId:', orgId);

            // Simple count queries that always work
            const [psychologists, candidates, exams, sessions] = await Promise.all([
                orgId
                    ? client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'psychologist' AND organization_id = $1`, [orgId])
                    : client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'psychologist'`),
                client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'candidate'`),
                client.query(`SELECT COUNT(*) as count FROM exams`),
                client.query(`SELECT COUNT(*) as count FROM exam_attempts WHERE status = 'in_progress'`)
            ]);

            console.log('Stats API - Counts:', {
                psych: psychologists.rows[0].count,
                cand: candidates.rows[0].count,
                exam: exams.rows[0].count,
                sess: sessions.rows[0].count
            });

            const stats = {
                totalPsychologists: parseInt(psychologists.rows[0].count),
                totalCandidates: parseInt(candidates.rows[0].count),
                totalExams: parseInt(exams.rows[0].count),
                activeSessions: parseInt(sessions.rows[0].count)
            };

            return NextResponse.json({ stats, organization });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
