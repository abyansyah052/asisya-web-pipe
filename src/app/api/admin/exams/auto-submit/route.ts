import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// Auto-submit all expired exam attempts
export async function POST() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // Find and auto-submit all expired attempts
            const result = await client.query(`
                UPDATE exam_attempts ea
                SET 
                    status = 'completed',
                    end_time = ea.start_time + (e.duration_minutes * interval '1 minute'),
                    score = COALESCE((
                        SELECT COUNT(*) 
                        FROM answers a 
                        JOIN options o ON a.selected_option_id = o.id 
                        WHERE a.attempt_id = ea.id AND o.is_correct = TRUE
                    ), 0)
                FROM exams e
                WHERE ea.exam_id = e.id
                AND ea.status = 'in_progress'
                AND ea.start_time + (e.duration_minutes * interval '1 minute') < NOW()
                RETURNING ea.id, ea.user_id, e.title as exam_title
            `);

            return NextResponse.json({
                success: true,
                autoSubmittedCount: result.rowCount,
                submissions: result.rows
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Auto-submit error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// GET: Check how many attempts are expired but not submitted
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
            const result = await client.query(`
                SELECT 
                    ea.id as attempt_id,
                    u.full_name as candidate_name,
                    e.title as exam_title,
                    ea.start_time,
                    ea.start_time + (e.duration_minutes * interval '1 minute') as should_end_at,
                    NOW() - (ea.start_time + (e.duration_minutes * interval '1 minute')) as overtime
                FROM exam_attempts ea
                JOIN exams e ON ea.exam_id = e.id
                JOIN users u ON ea.user_id = u.id
                WHERE ea.status = 'in_progress'
                AND ea.start_time + (e.duration_minutes * interval '1 minute') < NOW()
                ORDER BY ea.start_time DESC
            `);

            return NextResponse.json({
                expiredCount: result.rowCount,
                expiredAttempts: result.rows
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Check expired error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
