import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    if (session.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    try {
        const { examId, groups } = await request.json();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Soft delete existing groups for this exam
            await client.query(
                'UPDATE exam_assessors SET deleted_at = NOW() WHERE exam_id = $1 AND deleted_at IS NULL',
                [examId]
            );

            // Insert new groups
            for (const group of groups) {
                if (group.candidates.length > 0) {
                    await client.query(
                        `INSERT INTO exam_assessors (exam_id, admin_id, candidate_ids, created_at)
                         VALUES ($1, $2, $3, NOW())
                         ON CONFLICT (exam_id, admin_id) WHERE deleted_at IS NULL
                         DO UPDATE SET candidate_ids = $3, deleted_at = NULL`,
                        [examId, group.adminId, group.candidates]
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
        console.error('Error saving groups:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}