import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { examId, assignments } = await req.json();

        if (!examId || !Array.isArray(assignments)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete existing assignments for this exam
            await client.query(
                'DELETE FROM exam_assessors WHERE exam_id = $1',
                [examId]
            );

            // Insert new assignments
            for (const assignment of assignments) {
                if (assignment.psychologistId) {
                    await client.query(
                        `INSERT INTO exam_assessors (exam_id, user_id, assessor_id, admin_id)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT DO NOTHING`,
                        [examId, assignment.candidateId, assignment.psychologistId, session.id]
                    );
                }
            }

            await client.query('COMMIT');

            return NextResponse.json({ success: true });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error saving assignments:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
