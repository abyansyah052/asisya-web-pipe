import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';
import { verificationCodes } from '@/lib/verification-store';

export async function POST(req: Request) {
    try {
        // Auth check
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { examId, code } = await req.json();

        if (!examId || !code) {
            return NextResponse.json({ error: 'Exam ID and verification code required' }, { status: 400 });
        }

        // Verify code
        const storedCode = verificationCodes.get(examId);
        if (!storedCode || storedCode !== code) {
            return NextResponse.json({ error: 'Kode verifikasi salah atau sudah kedaluwarsa' }, { status: 400 });
        }

        // Delete verification code after use
        verificationCodes.delete(examId);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if this is a protected exam type (PSS or SRQ-29)
            const examCheck = await client.query(
                'SELECT exam_type FROM exams WHERE id = $1',
                [examId]
            );

            if (examCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 });
            }

            const examType = examCheck.rows[0].exam_type;
            const protectedTypes = ['pss', 'srq29'];

            if (protectedTypes.includes(examType)) {
                await client.query('ROLLBACK');
                return NextResponse.json({
                    error: `Ujian ${examType.toUpperCase()} adalah soal khusus yang tidak dapat dihapus`
                }, { status: 403 });
            }

            // Delete exam (CASCADE will delete questions, options, attempts, and answers)
            await client.query('DELETE FROM exams WHERE id = $1', [examId]);

            await client.query('COMMIT');
            return NextResponse.json({ success: true });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting exam:', error);
        return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 });
    }
}
