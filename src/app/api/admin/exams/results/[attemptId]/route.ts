import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// DELETE - Soft delete exam result (marks as deleted, doesn't actually remove)
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ attemptId: string }> }
) {
    try {
        const { attemptId } = await params;
        
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const client = await pool.connect();
        try {
            // Check if attempt exists
            const checkRes = await client.query(
                'SELECT id, status FROM exam_attempts WHERE id = $1',
                [attemptId]
            );

            if (checkRes.rows.length === 0) {
                return NextResponse.json({ error: 'Hasil ujian tidak ditemukan' }, { status: 404 });
            }

            // Soft delete - update status to 'deleted' instead of hard delete
            // This preserves data integrity while hiding from normal queries
            await client.query(
                `UPDATE exam_attempts 
                 SET status = 'deleted', 
                     deleted_at = NOW(),
                     deleted_by = $2
                 WHERE id = $1`,
                [attemptId, session.id]
            );

            return NextResponse.json({ 
                success: true, 
                message: 'Hasil ujian berhasil dihapus' 
            });

        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
