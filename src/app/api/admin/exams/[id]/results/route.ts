import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = await params;
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('showAll') === 'true';
    const includeInProgress = searchParams.get('includeInProgress') === 'true';

    // Get session to check admin assignment
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    // ✅ Use JWT session helper
    const session = await getSession(sessionCookie?.value);

    // Check authorization
    if (!session || !canAccessPsychologistFeatures(session.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let assignedCandidates: number[] = [];
    let isAssignedOnly = false;

    // For psychologist role, check if they have specific candidate assignments
    if (session.role === 'psychologist') {
        // ✅ Use candidate_groups instead of exam_assessors
        const assignmentRes = await pool.query(
            'SELECT ARRAY_AGG(candidate_id) as candidate_ids FROM candidate_groups WHERE exam_id = $1 AND assessor_id = $2',
            [examId, session.id]
        );

        if (assignmentRes.rows.length > 0 && assignmentRes.rows[0].candidate_ids) {
            assignedCandidates = assignmentRes.rows[0].candidate_ids || [];
            isAssignedOnly = true;
        }
    }

    const client = await pool.connect();
    try {
        // Get exam details
        const examRes = await client.query('SELECT * FROM exams WHERE id = $1', [examId]);
        const exam = examRes.rows[0];

        // Get attempts with user info and admin assignments
        // ✅ Use COALESCE to get full_name from user_profiles if users.full_name is NULL
        // ✅ Use DISTINCT ON to only get the latest attempt per user
        // ✅ Include 'in_progress' status if includeInProgress is true (for viewing candidates who started but haven't finished)
        const statusFilter = includeInProgress ? "AND ea.status IN ('completed', 'in_progress')" : "AND ea.status = 'completed'";
        
        const attemptsQuery = `
        SELECT DISTINCT ON (ea.user_id)
            ea.id, 
            ea.user_id,
            COALESCE(up.full_name, u.full_name, u.username) as student, 
            ea.score, 
            ea.end_time,
            ea.status as attempt_status,
            ea.start_time,
            up.gender,
            (
                SELECT COUNT(*) 
                FROM answers a 
                JOIN options o ON a.selected_option_id = o.id 
                WHERE a.attempt_id = ea.id AND o.is_correct = TRUE
            ) as correct_count,
            (
                SELECT COUNT(*) 
                FROM answers a 
                JOIN options o ON a.selected_option_id = o.id 
                WHERE a.attempt_id = ea.id AND o.is_correct = FALSE
            ) as incorrect_count
        FROM exam_attempts ea
        JOIN users u ON ea.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE ea.exam_id = $1 ${statusFilter}
        ORDER BY ea.user_id, ea.end_time DESC NULLS LAST
      `;

        const attemptsRes = await client.query(attemptsQuery, [examId]);

        // ✅ Get all psychologist assignments from candidate_groups
        // ✅ Use COALESCE for admin_name to handle NULL full_name
        const adminAssignmentsQuery = `
            SELECT 
                cg.assessor_id as admin_id,
                ARRAY_AGG(cg.candidate_id) as candidate_ids,
                COALESCE(u.full_name, u.username) as admin_name
            FROM candidate_groups cg
            JOIN users u ON cg.assessor_id = u.id
            WHERE cg.exam_id = $1 
            AND u.role IN ('psychologist', 'admin', 'super_admin')
            GROUP BY cg.assessor_id, u.full_name, u.username
            ORDER BY COALESCE(u.full_name, u.username)
        `;
        const adminAssignmentsRes = await client.query(adminAssignmentsQuery, [examId]);

        // Create admin list with their candidates
        const adminList = adminAssignmentsRes.rows.map((row: any) => ({
            admin_id: row.admin_id,
            admin_name: row.admin_name,
            candidate_ids: row.candidate_ids || []
        }));

        return NextResponse.json({
            exam,
            results: attemptsRes.rows,
            assignedCandidates,
            isAssignedOnly,
            adminList
        });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    } finally {
        client.release();
    }
}
