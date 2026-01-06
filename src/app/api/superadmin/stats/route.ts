import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessSuperAdminFeatures } from '@/lib/roles';

export async function GET() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    if (!canAccessSuperAdminFeatures(session.role)) {
        return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    try {
        // Get total admins (owners/clients)
        const adminsResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE role = $1', 
            [ROLES.ADMIN]
        );
        const totalAdmins = parseInt(adminsResult.rows[0].count);

        // Get total psychologists
        const psychResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE role = $1', 
            [ROLES.PSYCHOLOGIST]
        );
        const totalPsychologists = parseInt(psychResult.rows[0].count);

        // Get total candidates
        const candidatesResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE role = $1', 
            [ROLES.CANDIDATE]
        );
        const totalCandidates = parseInt(candidatesResult.rows[0].count);

        // Get total exams
        const examsResult = await pool.query('SELECT COUNT(*) as count FROM exams');
        const totalExams = parseInt(examsResult.rows[0].count);

        // Get total organizations
        let totalOrganizations = 0;
        try {
            const orgsResult = await pool.query('SELECT COUNT(*) as count FROM organizations');
            totalOrganizations = parseInt(orgsResult.rows[0].count);
        } catch {
            // Table might not exist yet
        }

        return NextResponse.json({
            totalAdmins,
            totalPsychologists,
            totalCandidates,
            totalExams,
            totalOrganizations
        });
    } catch (error) {
        console.error('Error fetching super admin stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
