/**
 * Script untuk cleanup dan seed ulang PSS/SRQ di production
 * 
 * Masalah: Ada banyak exam PSS dan SRQ duplikat dengan jumlah soal tidak benar
 * Solusi: Hapus semua, sisakan ID 9 (PSS) dan 10 (SRQ), cleanup soal duplikat
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// PSS Questions (10 soal)
const PSS_QUESTIONS = [
    { order: 1, text: "Seberapa sering Anda merasa kecewa karena sesuatu yang tidak terduga terjadi?", reverse: false },
    { order: 2, text: "Seberapa sering Anda merasa tidak mampu mengontrol hal-hal penting dalam hidup Anda?", reverse: false },
    { order: 3, text: "Seberapa sering Anda merasa gugup dan stres?", reverse: false },
    { order: 4, text: "Seberapa sering Anda merasa yakin dengan kemampuan Anda untuk menangani masalah pribadi Anda?", reverse: true },
    { order: 5, text: "Seberapa sering Anda merasa bahwa segala sesuatu berjalan sesuai keinginan Anda?", reverse: true },
    { order: 6, text: "Seberapa sering Anda merasa tidak dapat mengatasi semua hal yang harus Anda lakukan?", reverse: false },
    { order: 7, text: "Seberapa sering Anda mampu mengontrol gangguan dalam hidup Anda?", reverse: true },
    { order: 8, text: "Seberapa sering Anda merasa berada di atas segalanya?", reverse: true },
    { order: 9, text: "Seberapa sering Anda marah karena hal-hal yang terjadi di luar kendali Anda?", reverse: false },
    { order: 10, text: "Seberapa sering Anda merasa kesulitan menumpuk begitu tinggi sehingga Anda tidak dapat mengatasinya?", reverse: false }
];

const PSS_OPTIONS = [
    { text: "Tidak Pernah", score: 0 },
    { text: "Hampir Tidak Pernah", score: 1 },
    { text: "Kadang-kadang", score: 2 },
    { text: "Cukup Sering", score: 3 },
    { text: "Sangat Sering", score: 4 }
];

// SRQ-29 Questions (29 soal)
const SRQ_QUESTIONS = [
    // Anxiety/Depression (1-20)
    { order: 1, text: "Apakah Anda sering menderita sakit kepala?" },
    { order: 2, text: "Apakah Anda kehilangan nafsu makan?" },
    { order: 3, text: "Apakah Anda tidur tidak nyenyak?" },
    { order: 4, text: "Apakah Anda mudah menjadi takut?" },
    { order: 5, text: "Apakah tangan Anda gemetar?" },
    { order: 6, text: "Apakah Anda merasa cemas, tegang, atau khawatir?" },
    { order: 7, text: "Apakah pencernaan Anda buruk?" },
    { order: 8, text: "Apakah Anda mengalami kesulitan berpikir jernih?" },
    { order: 9, text: "Apakah Anda merasa tidak bahagia?" },
    { order: 10, text: "Apakah Anda menangis lebih sering dari biasanya?" },
    { order: 11, text: "Apakah Anda merasa sulit menikmati kegiatan sehari-hari?" },
    { order: 12, text: "Apakah Anda merasa sulit membuat keputusan?" },
    { order: 13, text: "Apakah pekerjaan sehari-hari Anda terganggu?" },
    { order: 14, text: "Apakah Anda tidak mampu berperan berguna dalam kehidupan?" },
    { order: 15, text: "Apakah Anda kehilangan minat terhadap berbagai hal?" },
    { order: 16, text: "Apakah Anda merasa tidak berharga?" },
    { order: 17, text: "Apakah Anda mempunyai pikiran untuk mengakhiri hidup?" },
    { order: 18, text: "Apakah Anda merasa lelah sepanjang waktu?" },
    { order: 19, text: "Apakah Anda merasa tidak enak di perut?" },
    { order: 20, text: "Apakah Anda mudah lelah?" },
    // Substance (21)
    { order: 21, text: "Apakah Anda minum alkohol lebih banyak dari biasanya atau menggunakan narkoba?" },
    // Psychotic (22-24)
    { order: 22, text: "Apakah Anda yakin bahwa seseorang mencoba menyakiti Anda dengan cara tertentu?" },
    { order: 23, text: "Apakah Anda pernah merasa bahwa seseorang atau sesuatu yang tidak dikenal mengganggu pikiran Anda?" },
    { order: 24, text: "Apakah Anda mendengar suara-suara yang tidak diketahui sumbernya atau yang tidak dapat didengar orang lain?" },
    // PTSD (25-29)
    { order: 25, text: "Apakah Anda pernah mengalami peristiwa yang sangat menakutkan, mengerikan, atau sangat membuat Anda sedih?" },
    { order: 26, text: "Apakah pikiran atau ingatan tentang peristiwa tersebut mengganggu Anda?" },
    { order: 27, text: "Apakah Anda mengalami mimpi buruk tentang peristiwa tersebut atau sulit tidur?" },
    { order: 28, text: "Apakah Anda mencoba menghindari aktivitas, tempat, orang, atau pikiran yang mengingatkan Anda pada peristiwa tersebut?" },
    { order: 29, text: "Apakah Anda mudah kaget atau merasa tegang sepanjang waktu?" }
];

const SRQ_OPTIONS = [
    { text: "Ya", score: 1 },
    { text: "Tidak", score: 0 }
];

async function cleanup() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🧹 Starting PSS/SRQ cleanup for production...\n');
        
        // 1. Check current state
        console.log('📊 Current state:');
        const currentExams = await client.query(`
            SELECT e.id, e.title, e.exam_type, 
                   COUNT(DISTINCT q.id) as question_count
            FROM exams e
            LEFT JOIN questions q ON q.exam_id = e.id
            WHERE e.exam_type IN ('pss', 'srq29')
            GROUP BY e.id, e.title, e.exam_type
            ORDER BY e.id
        `);
        currentExams.rows.forEach(r => {
            console.log(`  Exam ${r.id}: ${r.exam_type} - ${r.question_count} questions`);
        });
        
        // 2. Get IDs of exams to delete (all except 9 for PSS and 10 for SRQ)
        const duplicateExamIds = currentExams.rows
            .filter(r => !((r.id === 9 && r.exam_type === 'pss') || (r.id === 10 && r.exam_type === 'srq29')))
            .map(r => r.id);
        
        if (duplicateExamIds.length > 0) {
            console.log(`\n🗑️ Deleting duplicate exams: ${duplicateExamIds.join(', ')}`);
            
            // Delete exam_attempts for duplicate exams first
            await client.query(`
                DELETE FROM exam_attempts WHERE exam_id = ANY($1)
            `, [duplicateExamIds]);
            console.log('  ✓ Deleted exam_attempts');
            
            // Delete answers for questions in duplicate exams
            await client.query(`
                DELETE FROM answers 
                WHERE question_id IN (
                    SELECT id FROM questions WHERE exam_id = ANY($1)
                )
            `, [duplicateExamIds]);
            console.log('  ✓ Deleted answers');
            
            // Delete options for duplicate exams
            await client.query(`
                DELETE FROM options 
                WHERE question_id IN (
                    SELECT id FROM questions WHERE exam_id = ANY($1)
                )
            `, [duplicateExamIds]);
            console.log('  ✓ Deleted options');
            
            // Delete questions for duplicate exams
            await client.query(`
                DELETE FROM questions WHERE exam_id = ANY($1)
            `, [duplicateExamIds]);
            console.log('  ✓ Deleted questions');
            
            // Delete duplicate exams
            await client.query(`
                DELETE FROM exams WHERE id = ANY($1)
            `, [duplicateExamIds]);
            console.log('  ✓ Deleted duplicate exams');
        }
        
        // 3. Clean PSS (exam 9) - delete all questions and re-seed
        console.log('\n🔧 Cleaning and re-seeding PSS (exam 9)...');
        
        // Delete answers for PSS questions
        await client.query(`
            DELETE FROM answers 
            WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 9)
        `);
        
        // Delete options for PSS questions
        await client.query(`
            DELETE FROM options 
            WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 9)
        `);
        
        // Delete PSS questions
        await client.query(`DELETE FROM questions WHERE exam_id = 9`);
        console.log('  ✓ Cleared PSS questions');
        
        // Insert PSS questions
        for (const q of PSS_QUESTIONS) {
            const qResult = await client.query(`
                INSERT INTO questions (exam_id, text, question_type, marks)
                VALUES (9, $1, 'single_choice', 1)
                RETURNING id
            `, [q.text]);
            
            const questionId = qResult.rows[0].id;
            
            // Insert options with correct scoring (reverse if needed)
            for (let i = 0; i < PSS_OPTIONS.length; i++) {
                const opt = PSS_OPTIONS[i];
                const score = q.reverse ? (4 - opt.score) : opt.score;
                await client.query(`
                    INSERT INTO options (question_id, text, score)
                    VALUES ($1, $2, $3)
                `, [questionId, opt.text, score]);
            }
        }
        console.log('  ✓ Inserted 10 PSS questions with options');
        
        // 4. Clean SRQ (exam 10) - delete all questions and re-seed
        console.log('\n🔧 Cleaning and re-seeding SRQ (exam 10)...');
        
        // Delete answers for SRQ questions
        await client.query(`
            DELETE FROM answers 
            WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 10)
        `);
        
        // Delete options for SRQ questions
        await client.query(`
            DELETE FROM options 
            WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 10)
        `);
        
        // Delete SRQ questions
        await client.query(`DELETE FROM questions WHERE exam_id = 10`);
        console.log('  ✓ Cleared SRQ questions');
        
        // Insert SRQ questions
        for (const q of SRQ_QUESTIONS) {
            const qResult = await client.query(`
                INSERT INTO questions (exam_id, text, question_type, marks)
                VALUES (10, $1, 'single_choice', 1)
                RETURNING id
            `, [q.text]);
            
            const questionId = qResult.rows[0].id;
            
            // Insert SRQ options (Ya=1, Tidak=0)
            for (let i = 0; i < SRQ_OPTIONS.length; i++) {
                const opt = SRQ_OPTIONS[i];
                await client.query(`
                    INSERT INTO options (question_id, text, score)
                    VALUES ($1, $2, $3)
                `, [questionId, opt.text, opt.score]);
            }
        }
        console.log('  ✓ Inserted 29 SRQ questions with options');
        
        // 5. Verify final state
        console.log('\n📊 Final state:');
        const finalExams = await client.query(`
            SELECT e.id, e.title, e.exam_type, 
                   COUNT(DISTINCT q.id) as question_count,
                   COUNT(DISTINCT o.id) as option_count
            FROM exams e
            LEFT JOIN questions q ON q.exam_id = e.id
            LEFT JOIN options o ON o.question_id = q.id
            WHERE e.exam_type IN ('pss', 'srq29')
            GROUP BY e.id, e.title, e.exam_type
            ORDER BY e.id
        `);
        
        let allCorrect = true;
        finalExams.rows.forEach(r => {
            const expectedQ = r.exam_type === 'pss' ? 10 : 29;
            const expectedO = r.exam_type === 'pss' ? 50 : 58; // PSS: 10*5, SRQ: 29*2
            const qOk = parseInt(r.question_count) === expectedQ;
            const oOk = parseInt(r.option_count) === expectedO;
            const status = qOk && oOk ? '✅' : '❌';
            if (!qOk || !oOk) allCorrect = false;
            console.log(`  ${status} Exam ${r.id} (${r.exam_type}): ${r.question_count}/${expectedQ} questions, ${r.option_count}/${expectedO} options`);
        });
        
        if (allCorrect) {
            await client.query('COMMIT');
            console.log('\n✅ Cleanup completed successfully!');
        } else {
            await client.query('ROLLBACK');
            console.log('\n❌ Verification failed, rolled back changes.');
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
