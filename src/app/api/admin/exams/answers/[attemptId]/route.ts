import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ attemptId: string }> }
) {
    try {
        const { attemptId } = await params;
        
        // Get admin info from JWT session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userInfo = await decrypt(sessionCookie.value);
        
        if (!userInfo) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }
        
        // Check access: psychologist, admin, super_admin can access
        if (!canAccessPsychologistFeatures(userInfo.role as string)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get exam attempt details with answers
        const attemptResult = await pool.query(
            `SELECT 
                ea.id,
                ea.exam_id,
                ea.user_id,
                ea.score,
                ea.start_time,
                ea.end_time,
                e.title as exam_title,
                u.full_name,
                u.email
             FROM exam_attempts ea
             JOIN exams e ON ea.exam_id = e.id
             JOIN users u ON ea.user_id = u.id
             WHERE ea.id = $1`,
            [attemptId]
        );

        if (attemptResult.rows.length === 0) {
            return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 });
        }

        const attempt = attemptResult.rows[0];

        // If user is psychologist, check if this candidate is assigned to them
        if (userInfo.role === 'psychologist') {
            const assignmentCheck = await pool.query(
                `SELECT 1 FROM exam_assessors
                 WHERE admin_id = $1 
                 AND exam_id = $2 
                 AND deleted_at IS NULL
                 AND $3 = ANY(candidate_ids)`,
                [userInfo.id, attempt.exam_id, attempt.user_id]
            );

            if (assignmentCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Not authorized to view this candidate' }, { status: 403 });
            }
        }

        // Get all answers with questions
        const answersResult = await pool.query(
            `SELECT 
                ea.id,
                ea.question_id,
                ea.selected_answer,
                ea.is_correct,
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer,
                q.question_number
             FROM exam_answers ea
             JOIN questions q ON ea.question_id = q.id
             WHERE ea.attempt_id = $1
             ORDER BY q.question_number ASC`,
            [attemptId]
        );

        return NextResponse.json({
            attempt,
            answers: answersResult.rows
        });

    } catch (error) {
        console.error('Error fetching exam answers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
