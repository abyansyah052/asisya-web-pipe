import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const examId = searchParams.get('examId');

        if (!examId) {
            return NextResponse.json({ error: 'examId required' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Get all candidates who:
            // 1. Have a candidate_code for this exam
            // 2. Have attempted this exam
            // 3. Are assigned via candidate_groups (with assessor_id, NOT psychologist_id)
            // ✅ Use COALESCE to prefer user_profiles.full_name > users.full_name > username
            // ✅ Include company_code for filtering
            const result = await client.query(
                `SELECT DISTINCT u.id, u.username, 
                        COALESCE(up.full_name, u.full_name, u.username) as full_name,
                        COALESCE(cg.assessor_id, NULL) as assigned_to,
                        company.code as company_code
                 FROM users u
                 LEFT JOIN user_profiles up ON up.user_id = u.id
                 LEFT JOIN candidate_codes cc ON cc.candidate_id = u.id AND cc.exam_id = $1
                 LEFT JOIN company_codes company ON cc.company_code_id = company.id
                 LEFT JOIN exam_attempts et ON et.user_id = u.id AND et.exam_id = $1
                 LEFT JOIN candidate_groups cg ON cg.candidate_id = u.id AND cg.exam_id = $1
                 WHERE u.role = 'candidate'
                   AND (cc.id IS NOT NULL OR et.id IS NOT NULL OR cg.id IS NOT NULL)
                 ORDER BY COALESCE(up.full_name, u.full_name, u.username)`,
                [examId]
            );

            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching candidates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
