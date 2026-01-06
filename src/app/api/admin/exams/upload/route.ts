import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
    try {
        // Auth check
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;

        if (!file || !title) {
            return NextResponse.json({ error: 'File and Title are required' }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Create Exam
            const examRes = await client.query(
                'INSERT INTO exams (title, description, status) VALUES ($1, $2, $3) RETURNING id',
                [title, 'Imported from Excel', 'published']
            );
            const examId = examRes.rows[0].id;

            // 2. Iterate Rows
            // Expecting columns: "question", "options", "correct_answer"
            for (const row of rows) {
                // Normalize keys (lowercase)
                const qText = row['question'] || row['Question'] || row['Soal'] || row['soal'];
                const optsRaw = row['options'] || row['Options'] || row['Opsi'] || row['opsi'];
                const correctRaw = row['correct_answer'] || row['correct'] || row['Jawaban'] || row['jawaban_benar'];

                if (!qText || !optsRaw || !correctRaw) {
                    continue; // Skip invalid rows or throw error?
                }

                // Insert Question
                const qRes = await client.query(
                    'INSERT INTO questions (exam_id, text, marks) VALUES ($1, $2, $3) RETURNING id',
                    [examId, qText, 1]
                );
                const qId = qRes.rows[0].id;

                // Parse Options (Assumed to be separated by ; or | or newline)
                const optionsList = optsRaw.toString().split(/[;|\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);

                // Insert Options
                for (const optText of optionsList) {
                    // Check if this option is the correct one
                    // We'll compare normalized strings
                    const isCorrect = optText.trim().toLowerCase() === correctRaw.toString().trim().toLowerCase();

                    await client.query(
                        'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
                        [qId, optText, isCorrect]
                    );
                }
            }

            await client.query('COMMIT');
            return NextResponse.json({ success: true, examId });

        } catch (dbError) {
            await client.query('ROLLBACK');
            console.error('DB Error:', dbError);
            return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
