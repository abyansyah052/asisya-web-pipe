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

            // Delete existing assignments for this exam from candidate_groups
            await client.query(
                'DELETE FROM candidate_groups WHERE exam_id = $1',
                [examId]
            );

            // Insert new assignments into candidate_groups
            for (const assignment of assignments) {
                if (assignment.psychologistId && assignment.candidateId) {
                    await client.query(
                        `INSERT INTO candidate_groups (exam_id, candidate_id, assessor_id, assigned_by, created_at)
                         VALUES ($1, $2, $3, $4, NOW())
                         ON CONFLICT (exam_id, candidate_id) DO UPDATE SET assessor_id = $3, assigned_by = $4`,
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
