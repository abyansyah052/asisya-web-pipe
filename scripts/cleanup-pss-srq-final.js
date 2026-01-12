/**
 * FINAL cleanup script - hapus semua duplikat dan seed ulang dengan benar
 * Masalah: Script cleanup sebelumnya INSERT tanpa DELETE, jadi soal terus bertambah
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// PSS Questions (10 soal)
const PSS_QUESTIONS = [
    'Selama sebulan terakhir, seberapa sering anda marah karena sesuatu yang tidak terduga',
    'Selama sebulan terakhir, seberapa sering anda merasa tidak mampu mengontrol hal-hal yang penting dalam kehidupan anda',
    'Selama sebulan terakhir, seberapa sering anda merasa gelisah dan tertekan',
    'Selama sebulan terakhir, seberapa sering anda merasa yakin terhadap kemampuan diri untuk mengatasi masalah pribadi',
    'Selama sebulan terakhir, seberapa sering anda merasa segala sesuatu yang terjadi sesuai dengan harapan anda',
    'Selama sebulan terakhir, seberapa sering anda merasa tidak mampu menyelesaikan hal-hal yang harus dikerjakan',
    'Selama sebulan terakhir, seberapa sering anda mampu mengontrol rasa mudah tersinggung dalam kehidupan anda',
    'Selama sebulan terakhir, seberapa sering anda merasa lebih mampu mengatasi masalah jika dibandingkan dengan orang lain',
    'Selama sebulan terakhir, seberapa sering anda marah karena adanya masalah yang tidak dapat anda kendalikan',
    'Selama sebulan terakhir, seberapa sering anda merasakan kesulitan yang menumpuk sehingga anda tidak mampu untuk mengatasinya'
];

const PSS_OPTIONS = [
    '0 - Tidak pernah',
    '1 - Hampir tidak pernah (1-2 kali)',
    '2 - Kadang-kadang (3-4 kali)',
    '3 - Hampir sering (5-6 kali)',
    '4 - Sangat sering (lebih dari 6 kali)'
];

// SRQ-29 Questions (29 soal)
const SRQ_QUESTIONS = [
    'Apakah Anda sering merasa sakit kepala?',
    'Apakah Anda kehilangan nafsu makan?',
    'Apakah tidur anda tidak nyenyak?',
    'Apakah anda mudah merasa takut?',
    'Apakah anda merasa cemas, tegang, atau khawatir?',
    'Apakah tangan anda gemetar?',
    'Apakah anda mengalami gangguan pencernaan?',
    'Apakah anda merasa sulit berpikir jernih?',
    'Apakah anda merasa tidak Bahagia?',
    'Apakah anda lebih sering menangis?',
    'Apakah anda merasa sulit untuk menikmati aktivitas sehari-hari?',
    'Apakah anda mengalami kesulitan untuk mengambil keputusan?',
    'Apakah aktivitas/tugas sehari-hari anda terbengkalai?',
    'Apakah anda merasa tidak mampu berperan dalam kehidupan ini?',
    'Apakah anda kehilangan minat terhadap banyak hal?',
    'Apakah anda merasa tidak berharga?',
    'Apakah anda mempunyai pikiran untuk mengakhiri hidup anda?',
    'Apakah anda merasa Lelah sepanjang waktu?',
    'Apakah anda merasa tidak enak di perut?',
    'Apakah anda mudah Lelah?',
    'Apakah anda minum alcohol lebih banyak dari biasanya atau apakah anda menggunakan narkoba?',
    'Apakah anda yakin bahwa seseorang mencoba mencelakai anda dengan cara tertentu?',
    'Apakah ada yang mengganggu atau hal yang tidak biasa dalam pikiran anda?',
    'Apakah anda pernah mendengar suara tanpa tahu sumbernya atau yang orang lain tidak dapat mendengar?',
    'Apakah anda mengalami mimpi yang mengganggu tentang suatu bencana/musibah atau adakah saat-saat anda seolah mengalami Kembali bencana itu?',
    'Apakah anda menghindari kegiatan, tempat, orang atau pikiran yang mengingatkan anda akan bencana tersebut?',
    'Apakah minat anda terhadap teman dan kegiatan yang biasa anda lakukan berkurang?',
    'Apakah anda merasa sangat terganggu jika berada dalam situasi yang mengingatkan anda akan bencana atau jika anda berpikir tentang bencana itu?',
    'Apakah anda kesulitan memahami atau mengekspresikan perasaan anda?'
];

const SRQ_OPTIONS = ['Ya', 'Tidak'];

const PSS_INSTRUCTIONS = `PETUNJUK PENGISIAN

1. Bacalah pertanyaan dan pernyataan berikut dengan baik
2. Anda diperbolehkan bertanya kepada peneliti jika ada pertanyaan yang tidak dimengerti
3. Berikan tanda centang (✓) pada salah satu pilihan jawaban yang paling sesuai dengan perasaan dan pikiran anda selama SATU BULAN TERAKHIR
4. Untuk pertanyaan nomor 4, 5, 7, dan 8 merupakan pertanyaan positif yang skornya akan dihitung terbalik secara otomatis

KETERANGAN SKOR:
• 0 = Tidak pernah
• 1 = Hampir tidak pernah (1-2 kali)
• 2 = Kadang-kadang (3-4 kali)
• 3 = Hampir sering (5-6 kali)
• 4 = Sangat sering (lebih dari 6 kali)

KATEGORI HASIL:
• Skor 1-13 = Stres Ringan
• Skor 14-26 = Stres Sedang
• Skor 27-40 = Stres Berat

Selamat mengisi dan terima kasih atas kerjasamanya.`;

const SRQ_INSTRUCTIONS = `PETUNJUK PENGISIAN

Self-Reporting Questionnaire (SRQ-29) adalah alat skrining untuk mendeteksi gangguan kesehatan mental.

1. Bacalah setiap pertanyaan dengan seksama
2. Jawab setiap pertanyaan dengan jujur sesuai dengan kondisi yang Anda alami
3. Pilih "Ya" jika Anda mengalami gejala tersebut, atau "Tidak" jika tidak mengalaminya
4. Tidak ada jawaban benar atau salah

INTERPRETASI:
• Pertanyaan 1-20: Mendeteksi gejala kecemasan dan depresi
• Pertanyaan 21: Penggunaan zat psikoaktif/narkoba
• Pertanyaan 22-24: Gejala gangguan psikotik
• Pertanyaan 25-29: Gejala PTSD (Post-Traumatic Stress Disorder)

Hasil akan dihitung secara otomatis berdasarkan jawaban Anda.

Selamat mengisi.`;

async function cleanup() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🧹 FINAL PSS/SRQ cleanup...\n');
        
        // 1. Get all PSS and SRQ exams
        console.log('📊 Finding all PSS/SRQ exams...');
        const allExams = await client.query(`
            SELECT id, title, exam_type FROM exams 
            WHERE exam_type IN ('pss', 'srq29')
            ORDER BY id
        `);
        console.log('Found:', allExams.rows.map(r => `${r.id}:${r.exam_type}`).join(', '));
        
        // 2. Keep only the FIRST PSS (id 9) and FIRST SRQ (id 10), delete all others
        const pssExams = allExams.rows.filter(r => r.exam_type === 'pss');
        const srqExams = allExams.rows.filter(r => r.exam_type === 'srq29');
        
        const keepPssId = 9;  // Original PSS
        const keepSrqId = 10; // Original SRQ
        
        // IDs to delete
        const deleteExamIds = [
            ...pssExams.filter(r => r.id !== keepPssId).map(r => r.id),
            ...srqExams.filter(r => r.id !== keepSrqId).map(r => r.id)
        ];
        
        if (deleteExamIds.length > 0) {
            console.log(`\n🗑️ Deleting duplicate exams: ${deleteExamIds.join(', ')}`);
            
            // Delete in correct order (dependencies first)
            await client.query(`DELETE FROM exam_answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ANY($1))`, [deleteExamIds]);
            await client.query(`DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ANY($1))`, [deleteExamIds]);
            await client.query(`DELETE FROM exam_attempts WHERE exam_id = ANY($1)`, [deleteExamIds]);
            await client.query(`DELETE FROM questions WHERE exam_id = ANY($1)`, [deleteExamIds]);
            await client.query(`DELETE FROM exams WHERE id = ANY($1)`, [deleteExamIds]);
            console.log('  ✓ Deleted duplicate exams');
        }
        
        // 3. COMPLETELY CLEAR and re-seed PSS (exam 9)
        console.log(`\n🔧 Clearing and re-seeding PSS (exam ${keepPssId})...`);
        
        // First delete ALL existing data for PSS
        await client.query(`DELETE FROM exam_answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [keepPssId]);
        await client.query(`DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [keepPssId]);
        await client.query(`DELETE FROM questions WHERE exam_id = $1`, [keepPssId]);
        console.log('  ✓ Cleared all PSS questions and options');
        
        // Update PSS exam metadata
        await client.query(`UPDATE exams SET instructions = $1 WHERE id = $2`, [PSS_INSTRUCTIONS, keepPssId]);
        
        // Insert PSS questions (BULK INSERT for performance)
        const pssQuestionValues = PSS_QUESTIONS.map((q, i) => `(${keepPssId}, '${q.replace(/'/g, "''")}', 1)`).join(',');
        const pssQResult = await client.query(`
            INSERT INTO questions (exam_id, text, marks) 
            VALUES ${pssQuestionValues}
            RETURNING id
        `);
        
        // Insert PSS options (BULK INSERT)
        const pssOptionValues = [];
        pssQResult.rows.forEach((q) => {
            PSS_OPTIONS.forEach(opt => {
                pssOptionValues.push(`(${q.id}, '${opt.replace(/'/g, "''")}', false)`);
            });
        });
        await client.query(`INSERT INTO options (question_id, text, is_correct) VALUES ${pssOptionValues.join(',')}`);
        console.log(`  ✓ Inserted ${PSS_QUESTIONS.length} PSS questions with ${PSS_OPTIONS.length} options each`);
        
        // 4. COMPLETELY CLEAR and re-seed SRQ (exam 10)
        console.log(`\n🔧 Clearing and re-seeding SRQ (exam ${keepSrqId})...`);
        
        // First delete ALL existing data for SRQ
        await client.query(`DELETE FROM exam_answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [keepSrqId]);
        await client.query(`DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [keepSrqId]);
        await client.query(`DELETE FROM questions WHERE exam_id = $1`, [keepSrqId]);
        console.log('  ✓ Cleared all SRQ questions and options');
        
        // Update SRQ exam metadata
        await client.query(`UPDATE exams SET instructions = $1 WHERE id = $2`, [SRQ_INSTRUCTIONS, keepSrqId]);
        
        // Insert SRQ questions (BULK INSERT)
        const srqQuestionValues = SRQ_QUESTIONS.map((q, i) => `(${keepSrqId}, '${q.replace(/'/g, "''")}', 1)`).join(',');
        const srqQResult = await client.query(`
            INSERT INTO questions (exam_id, text, marks) 
            VALUES ${srqQuestionValues}
            RETURNING id
        `);
        
        // Insert SRQ options (BULK INSERT)
        const srqOptionValues = [];
        srqQResult.rows.forEach((q) => {
            SRQ_OPTIONS.forEach(opt => {
                srqOptionValues.push(`(${q.id}, '${opt.replace(/'/g, "''")}', false)`);
            });
        });
        await client.query(`INSERT INTO options (question_id, text, is_correct) VALUES ${srqOptionValues.join(',')}`);
        console.log(`  ✓ Inserted ${SRQ_QUESTIONS.length} SRQ questions with ${SRQ_OPTIONS.length} options each`);
        
        // 5. Verify final state
        console.log('\n📊 Final verification:');
        const finalCheck = await client.query(`
            SELECT e.id, e.exam_type, 
                   COUNT(DISTINCT q.id) as q_count,
                   COUNT(DISTINCT o.id) as o_count
            FROM exams e
            LEFT JOIN questions q ON q.exam_id = e.id
            LEFT JOIN options o ON o.question_id = q.id
            WHERE e.exam_type IN ('pss', 'srq29')
            GROUP BY e.id, e.exam_type
            ORDER BY e.id
        `);
        
        let allGood = true;
        finalCheck.rows.forEach(r => {
            const expectQ = r.exam_type === 'pss' ? 10 : 29;
            const expectO = r.exam_type === 'pss' ? 50 : 58;
            const qOk = parseInt(r.q_count) === expectQ;
            const oOk = parseInt(r.o_count) === expectO;
            const status = qOk && oOk ? '✅' : '❌';
            if (!qOk || !oOk) allGood = false;
            console.log(`  ${status} Exam ${r.id} (${r.exam_type}): ${r.q_count} questions (expect ${expectQ}), ${r.o_count} options (expect ${expectO})`);
        });
        
        if (allGood && finalCheck.rows.length === 2) {
            await client.query('COMMIT');
            console.log('\n✅ FINAL cleanup completed successfully!');
        } else {
            await client.query('ROLLBACK');
            console.log('\n❌ Verification failed, rolled back.');
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup().catch(console.error);
