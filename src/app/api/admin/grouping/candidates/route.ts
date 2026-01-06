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
            // 3. Are assigned via exam_assessors
            const result = await client.query(
                `SELECT DISTINCT u.id, u.username, u.full_name,
                        COALESCE(ea.assessor_id, cg.psychologist_id) as assigned_to
                 FROM users u
                 LEFT JOIN candidate_codes cc ON cc.candidate_id = u.id AND cc.exam_id = $1
                 LEFT JOIN exam_attempts et ON et.user_id = u.id AND et.exam_id = $1
                 LEFT JOIN exam_assessors ea ON ea.user_id = u.id AND ea.exam_id = $1
                 LEFT JOIN candidate_groups cg ON cg.candidate_id = u.id AND cg.exam_id = $1
                 WHERE u.role = 'candidate'
                   AND (cc.id IS NOT NULL OR et.id IS NOT NULL OR ea.id IS NOT NULL OR cg.id IS NOT NULL)
                 ORDER BY u.username`,
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
