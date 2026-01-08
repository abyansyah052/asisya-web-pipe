import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';
import * as XLSX from 'xlsx';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: examId } = await params;
        const { searchParams } = new URL(request.url);
        const filterType = searchParams.get('filter') || 'all'; // 'all' or 'assigned'
        const psychologistId = searchParams.get('psychologistId'); // Optional: filter by specific psychologist

        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // Get exam info
            const examRes = await client.query('SELECT title FROM exams WHERE id = $1', [examId]);
            const examTitle = examRes.rows[0]?.title || 'Ujian';

            // Get question count for this exam
            const questionCountRes = await client.query(
                'SELECT COUNT(*) as count FROM questions WHERE exam_id = $1',
                [examId]
            );
            const questionCount = parseInt(questionCountRes.rows[0].count) || 0;

            // Get all completed attempts with user info
            // ✅ Use COALESCE to prefer user_profiles.full_name over users.full_name
            // ✅ Use DISTINCT ON to only get the latest attempt per user
            // ✅ Include access code as nomor_peserta
            const attemptsRes = await client.query(
                `SELECT DISTINCT ON (ea.user_id)
                    ea.id as attempt_id,
                    ea.user_id,
                    ea.score,
                    ea.end_time,
                    COALESCE(up.full_name, u.full_name, u.username) as full_name,
                    u.username,
                    cc.code as nomor_peserta
                FROM exam_attempts ea
                JOIN users u ON ea.user_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN candidate_codes cc ON cc.candidate_id = u.id
                WHERE ea.exam_id = $1 AND ea.status = 'completed'
                ORDER BY ea.user_id, ea.end_time DESC`,
                [examId]
            );
            let attempts = attemptsRes.rows;

            // Filter by assignment if needed
            if (filterType === 'assigned' || psychologistId) {
                const targetPsychId = psychologistId ? parseInt(psychologistId) : session.id;

                // ✅ Use candidate_groups instead of exam_assessors
                const assignmentRes = await client.query(
                    'SELECT ARRAY_AGG(candidate_id) as candidate_ids FROM candidate_groups WHERE exam_id = $1 AND assessor_id = $2',
                    [examId, targetPsychId]
                );

                if (assignmentRes.rows.length > 0 && assignmentRes.rows[0].candidate_ids) {
                    const assignedIds = assignmentRes.rows[0].candidate_ids;
                    attempts = attempts.filter((a: any) => assignedIds.includes(a.user_id));
                }
            }

            // Get all questions for this exam (ordered)
            const questionsRes = await client.query(
                'SELECT id FROM questions WHERE exam_id = $1 ORDER BY id',
                [examId]
            );
            const questionIds = questionsRes.rows.map((q: any) => q.id);

            // Get all answers for these attempts
            const attemptIds = attempts.map((a: any) => a.attempt_id);

            let answersMap: Record<number, Record<number, { answer: string; is_correct: boolean }>> = {};

            if (attemptIds.length > 0) {
                const answersRes = await client.query(
                    `SELECT 
                        a.attempt_id,
                        a.question_id,
                        o.text as answer_text,
                        o.is_correct
                     FROM answers a
                     LEFT JOIN options o ON a.selected_option_id = o.id
                     WHERE a.attempt_id = ANY($1)`,
                    [attemptIds]
                );

                // Build answers map: attemptId -> { questionId -> { answer, is_correct } }
                answersRes.rows.forEach((row: any) => {
                    if (!answersMap[row.attempt_id]) {
                        answersMap[row.attempt_id] = {};
                    }
                    answersMap[row.attempt_id][row.question_id] = {
                        answer: row.answer_text || '',
                        is_correct: row.is_correct || false
                    };
                });
            }

            // Get user profiles for tab 2
            const userIds = attempts.map((a: any) => a.user_id);
            let profilesMap: Record<number, any> = {};

            if (userIds.length > 0) {
                const profilesRes = await client.query(
                    `SELECT 
                        user_id,
                        nomor_peserta,
                        jenis_kelamin as gender,
                        tanggal_lahir as birth_date,
                        usia,
                        pendidikan_terakhir as education,
                        pekerjaan as occupation,
                        lokasi_test as institution,
                        alamat_ktp as address,
                        nik,
                        full_name as profile_name,
                        marital_status
                     FROM user_profiles
                     WHERE user_id = ANY($1)`,
                    [userIds]
                );

                profilesRes.rows.forEach((row: any) => {
                    profilesMap[row.user_id] = row;
                });
            }

            // Create workbook
            const wb = XLSX.utils.book_new();

            // ===== TAB 1: Jawaban =====
            // Headers: No, Nama, Gender, 1, 2, 3, ... questionCount
            const answersHeaders = ['No', 'Nama', 'Gender'];
            for (let i = 1; i <= questionCount; i++) {
                answersHeaders.push(String(i));
            }

            const answersData: any[][] = [answersHeaders];

            attempts.forEach((attempt: any, index: number) => {
                const profile = profilesMap[attempt.user_id] || {};
                const answers = answersMap[attempt.attempt_id] || {};

                const row: any[] = [
                    index + 1,
                    attempt.full_name || attempt.username || '-',
                    profile.gender || '-'
                ];

                // Add answers for each question - show "benar" or "salah"
                questionIds.forEach((qId: number) => {
                    const answerData = answers[qId];
                    if (answerData) {
                        row.push(answerData.is_correct ? 'benar' : 'salah');
                    } else {
                        row.push(''); // Not answered
                    }
                });

                answersData.push(row);
            });

            const wsAnswers = XLSX.utils.aoa_to_sheet(answersData);
            XLSX.utils.book_append_sheet(wb, wsAnswers, 'Jawaban');

            // ===== TAB 2: Data Diri =====
            // ✅ Removed Email column, Added Nomor Peserta
            const profileHeaders = [
                'No',
                'Nama',
                'Nomor Peserta',
                'Jenis Kelamin',
                'Tanggal Lahir',
                'Usia',
                'Alamat KTP',
                'NIK',
                'Pendidikan',
                'Pekerjaan',
                'Lokasi Test',
                'Status Perkawinan',
                'Nilai',
                'Waktu Selesai'
            ];

            const profileData: any[][] = [profileHeaders];

            attempts.forEach((attempt: any, index: number) => {
                const profile = profilesMap[attempt.user_id] || {};

                // ✅ Use access code as nomor_peserta (from candidate_codes)
                profileData.push([
                    index + 1,
                    attempt.full_name || attempt.username || '-',
                    attempt.nomor_peserta || '-',
                    profile.gender || '-',
                    profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('id-ID') : '-',
                    profile.usia || '-',
                    profile.address || '-',
                    profile.nik || '-',
                    profile.education || '-',
                    profile.occupation || '-',
                    profile.institution || '-',
                    profile.marital_status || '-',
                    attempt.score || 0,
                    attempt.end_time ? new Date(attempt.end_time).toLocaleString('id-ID') : '-'
                ]);
            });

            const wsProfile = XLSX.utils.aoa_to_sheet(profileData);
            XLSX.utils.book_append_sheet(wb, wsProfile, 'Data Diri');

            // Generate buffer
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            // Create filename
            const filterLabel = filterType === 'assigned' ? '_Bagian_Saya' : '_Semua';
            const filename = `Hasil_${examTitle.replace(/[^a-zA-Z0-9]/g, '_')}${filterLabel}.xlsx`;

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error generating Excel:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
