import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: examId } = await params;
    
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
        const assignmentRes = await pool.query(
            'SELECT candidate_ids FROM exam_assessors WHERE exam_id = $1 AND admin_id = $2 AND deleted_at IS NULL',
            [examId, session.id]
        );
        
        if (assignmentRes.rows.length > 0) {
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
        const attemptsQuery = `
        SELECT 
            ea.id, 
            ea.user_id,
            u.full_name as student, 
            ea.score, 
            ea.end_time,
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
        WHERE ea.exam_id = $1 AND ea.status = 'completed'
        ORDER BY ea.end_time DESC
      `;

        const attemptsRes = await client.query(attemptsQuery, [examId]);

        // Get all psychologist assignments for this exam
        const adminAssignmentsQuery = `
            SELECT 
                ea.admin_id,
                ea.candidate_ids,
                u.full_name as admin_name
            FROM exam_assessors ea
            JOIN users u ON ea.admin_id = u.id
            WHERE ea.exam_id = $1 
            AND ea.deleted_at IS NULL
            AND u.role IN ('psychologist', 'admin', 'super_admin')
            ORDER BY u.full_name
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
