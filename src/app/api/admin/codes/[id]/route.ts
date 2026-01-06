import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// DELETE - Deactivate a code OR delete code + candidate (admin only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        // Check if we should also delete the candidate
        let deleteCandidate = false;
        try {
            const body = await req.json();
            deleteCandidate = body.deleteCandidate === true;
        } catch {
            // No body or invalid JSON, just deactivate the code
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get code info
            const codeResult = await client.query(
                'SELECT * FROM candidate_codes WHERE id = $1',
                [id]
            );

            if (codeResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Kode tidak ditemukan' }, { status: 404 });
            }

            const code = codeResult.rows[0];
            let candidateDeleted = false;

            if (deleteCandidate && code.used_by) {
                // Delete the candidate user and all related data
                const userId = code.used_by;

                // Delete user profiles
                await client.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
                
                // Delete exam attempts and answers
                await client.query(`
                    DELETE FROM exam_answers 
                    WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE user_id = $1)
                `, [userId]);
                await client.query('DELETE FROM exam_attempts WHERE user_id = $1', [userId]);

                // Delete the candidate code
                await client.query('DELETE FROM candidate_codes WHERE id = $1', [id]);

                // Delete the user
                await client.query('DELETE FROM users WHERE id = $1 AND role = $2', [userId, 'candidate']);
                
                candidateDeleted = true;
            } else {
                // Just deactivate the code
                await client.query(
                    'UPDATE candidate_codes SET is_active = false WHERE id = $1',
                    [id]
                );
            }

            await client.query('COMMIT');

            return NextResponse.json({ 
                success: true,
                candidateDeleted
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error processing code deletion:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
