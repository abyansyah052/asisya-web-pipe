import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

// SRQ-29 Result Texts mapping
const SRQ_RESULT_TEXTS: Record<string, string> = {
    'Normal': 'Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi. Tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma',
    'Tidak Normal - PTSD Only': 'Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.',
    'Tidak Normal - Cemas & Depresi': 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    'Tidak Normal - Episode Psikotik Only': 'Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma',
    'Tidak Normal - PTSD + Psikotik': 'Tidak Normal. Terdapat gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba',
    'Tidak Normal - Cemas, Depresi, PTSD': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan PTSD. Namun tidak terdapat gejala episode psikotik dan penggunaan zat psikoaktif/narkoba',
    'Tidak Normal - Cemas, Depresi, Psikotik': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan gejala episode psikotik. Namun tidak terdapat gejala PTSD dan penggunaan zat psikoaktif/narkoba',
    'Tidak Normal - All Symptoms': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun, tidak terdapat penggunaan zat adiktif/narkoba'
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const user = await getSession(sessionCookie?.value);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { attemptId, answers, result } = body;

        if (!attemptId || !answers || !result) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { anxiety, substance, psychotic, ptsd, conclusion } = result;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { id: examId } = await params;

            // Validate attempt ownership and status
            const attemptValidation = await client.query(
                `SELECT ea.id, ea.status, ea.user_id, e.exam_type
                 FROM exam_attempts ea
                 JOIN exams e ON ea.exam_id = e.id
                 WHERE ea.id = $1 AND ea.exam_id = $2`,
                [attemptId, examId]
            );

            if (attemptValidation.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Attempt tidak ditemukan' }, { status: 404 });
            }

            const attempt = attemptValidation.rows[0];

            if (attempt.user_id !== user.id) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }

            if (attempt.exam_type !== 'srq29') {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Bukan ujian SRQ-29' }, { status: 400 });
            }

            if (attempt.status === 'completed') {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Ujian sudah diselesaikan' }, { status: 403 });
            }

            // Count total YA answers for score
            let totalYes = 0;
            for (const key in answers) {
                if (answers[key] === 'Y') totalYes++;
            }

            // Get full result text
            const resultText = SRQ_RESULT_TEXTS[conclusion] || conclusion;

            // Store SRQ result
            const resultData = JSON.stringify({
                answers,
                result: {
                    anxiety,
                    substance,
                    psychotic,
                    ptsd,
                    conclusion,
                    resultText
                },
                type: 'srq29'
            });

            // Update attempt with SRQ-specific data
            await client.query(
                `UPDATE exam_attempts 
                 SET score = $1, status = 'completed', end_time = NOW(), 
                     srq_result = $2, srq_conclusion = $3
                 WHERE id = $4`,
                [totalYes, resultData, conclusion, attemptId]
            );

            await client.query('COMMIT');

            return NextResponse.json({ 
                success: true, 
                score: totalYes, 
                conclusion,
                resultText 
            });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            return NextResponse.json({ error: 'Submission Failed' }, { status: 500 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
