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
        // ✅ Use COALESCE to get full_name from user_profiles if users.full_name is NULL
        const attemptResult = await pool.query(
            `SELECT 
                ea.id,
                ea.exam_id,
                ea.user_id,
                ea.score,
                ea.start_time,
                ea.end_time,
                ea.pss_result,
                ea.pss_category,
                ea.srq_result,
                ea.srq_conclusion,
                e.title as exam_title,
                e.exam_type,
                COALESCE(up.full_name, u.full_name, u.username) as full_name,
                up.jenis_kelamin as gender,
                u.email
             FROM exam_attempts ea
             JOIN exams e ON ea.exam_id = e.id
             JOIN users u ON ea.user_id = u.id
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE ea.id = $1`,
            [attemptId]
        );

        if (attemptResult.rows.length === 0) {
            return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 });
        }

        const attempt = attemptResult.rows[0];

        // If user is psychologist, check assignment (for info only, not blocking)
        let isAssignedToMe = true; // default true for admin/super_admin
        if (userInfo.role === 'psychologist') {
            const assignmentCheck = await pool.query(
                `SELECT 1 FROM candidate_groups
                 WHERE assessor_id = $1 
                 AND exam_id = $2 
                 AND candidate_id = $3`,
                [userInfo.id, attempt.exam_id, attempt.user_id]
            );
            isAssignedToMe = assignmentCheck.rows.length > 0;
            // Note: We now allow psychologists to view all candidates' answers for reference
        }

        // Get all questions with their options for this exam
        const questionsResult = await pool.query(
            `SELECT 
                q.id,
                q.text as question_text,
                ROW_NUMBER() OVER (ORDER BY q.id) as question_number
             FROM questions q
             WHERE q.exam_id = $1
             ORDER BY q.id`,
            [attempt.exam_id]
        );

        // Get all options for these questions
        const questionIds = questionsResult.rows.map((q: { id: number }) => q.id);
        const optionsResult = await pool.query(
            `SELECT id, question_id, text, is_correct 
             FROM options 
             WHERE question_id = ANY($1::int[])
             ORDER BY question_id, id`,
            [questionIds]
        );

        // Get answers for this attempt
        const answersResult = await pool.query(
            `SELECT question_id, selected_option_id 
             FROM answers 
             WHERE attempt_id = $1`,
            [attemptId]
        );

        // Build answers map
        const answersMap = new Map<number, number>();
        answersResult.rows.forEach((a: { question_id: number; selected_option_id: number }) => {
            answersMap.set(a.question_id, a.selected_option_id);
        });

        // Build options map
        const optionsMap = new Map<number, { id: number; text: string; is_correct: boolean }[]>();
        optionsResult.rows.forEach((opt: { id: number; question_id: number; text: string; is_correct: boolean }) => {
            if (!optionsMap.has(opt.question_id)) {
                optionsMap.set(opt.question_id, []);
            }
            optionsMap.get(opt.question_id)!.push({
                id: opt.id,
                text: opt.text,
                is_correct: opt.is_correct
            });
        });

        // Build final response - only include answered questions
        const answers = questionsResult.rows
            .filter((q: { id: number }) => answersMap.has(q.id)) // Only include questions that were answered
            .map((q: { id: number; question_text: string; question_number: string }) => {
            const options = optionsMap.get(q.id) || [];
            const selectedOptionId = answersMap.get(q.id);
            const selectedOption = options.find(o => o.id === selectedOptionId);
            const correctOption = options.find(o => o.is_correct);
            
            return {
                id: q.id,
                question_id: q.id,
                question_text: q.question_text,
                question_number: parseInt(q.question_number), // This is the actual question number (e.g., 183)
                selected_option_id: selectedOptionId || null,
                selected_answer: selectedOption?.text || null,
                correct_answer: correctOption?.text || null,
                is_correct: selectedOptionId === correctOption?.id,
                options: options.map(o => ({
                    id: o.id,
                    text: o.text,
                    is_correct: o.is_correct
                }))
            };
        });

        return NextResponse.json({
            attempt,
            answers,
            isAssignedToMe,
            totalQuestions: questionsResult.rows.length,
            answeredQuestions: answers.length,
            // PSS/SRQ specific data
            examType: attempt.exam_type,
            pssResult: attempt.pss_result ? JSON.parse(attempt.pss_result) : null,
            pssCategory: attempt.pss_category,
            srqResult: attempt.srq_result ? JSON.parse(attempt.srq_result) : null,
            srqConclusion: attempt.srq_conclusion
        });

    } catch (error) {
        console.error('Error fetching exam answers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
