/**
 * Script untuk cleanup dan seed ulang PSS/SRQ di production
 * Sesuai dengan schema database (options punya is_correct, bukan score)
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
        
        // 2. Get the correct exam IDs (keep lowest ID for each type)
        const pssExams = currentExams.rows.filter(r => r.exam_type === 'pss').sort((a, b) => a.id - b.id);
        const srqExams = currentExams.rows.filter(r => r.exam_type === 'srq29').sort((a, b) => a.id - b.id);
        
        const pssExamId = pssExams[0]?.id;
        const srqExamId = srqExams[0]?.id;
        
        console.log(`\n📌 Keeping PSS exam ID: ${pssExamId}, SRQ exam ID: ${srqExamId}`);
        
        // 3. Get IDs of exams to delete
        const duplicateExamIds = currentExams.rows
            .filter(r => r.id !== pssExamId && r.id !== srqExamId)
            .map(r => r.id);
        
        if (duplicateExamIds.length > 0) {
            console.log(`\n🗑️ Deleting duplicate exams: ${duplicateExamIds.join(', ')}`);
            
            // Delete in order of dependencies
            await client.query(`DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ANY($1))`, [duplicateExamIds]);
            await client.query(`DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = ANY($1))`, [duplicateExamIds]);
            await client.query(`DELETE FROM exam_attempts WHERE exam_id = ANY($1)`, [duplicateExamIds]);
            await client.query(`DELETE FROM questions WHERE exam_id = ANY($1)`, [duplicateExamIds]);
            await client.query(`DELETE FROM exams WHERE id = ANY($1)`, [duplicateExamIds]);
            console.log('  ✓ Deleted duplicate exams');
        }
        
        // 4. Clean and re-seed PSS
        if (pssExamId) {
            console.log(`\n🔧 Cleaning and re-seeding PSS (exam ${pssExamId})...`);
            
            // Delete existing questions and options
            await client.query(`DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [pssExamId]);
            await client.query(`DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [pssExamId]);
            await client.query(`DELETE FROM questions WHERE exam_id = $1`, [pssExamId]);
            
            // Insert PSS questions
            for (const qText of PSS_QUESTIONS) {
                const qResult = await client.query(`
                    INSERT INTO questions (exam_id, text, marks)
                    VALUES ($1, $2, 1)
                    RETURNING id
                `, [pssExamId, qText]);
                
                const questionId = qResult.rows[0].id;
                
                // Insert PSS options
                for (const optText of PSS_OPTIONS) {
                    await client.query(`
                        INSERT INTO options (question_id, text, is_correct)
                        VALUES ($1, $2, false)
                    `, [questionId, optText]);
                }
            }
            console.log('  ✓ Inserted 10 PSS questions with 5 options each');
        }
        
        // 5. Clean and re-seed SRQ
        if (srqExamId) {
            console.log(`\n🔧 Cleaning and re-seeding SRQ (exam ${srqExamId})...`);
            
            // Delete existing questions and options
            await client.query(`DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [srqExamId]);
            await client.query(`DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)`, [srqExamId]);
            await client.query(`DELETE FROM questions WHERE exam_id = $1`, [srqExamId]);
            
            // Insert SRQ questions
            for (const qText of SRQ_QUESTIONS) {
                const qResult = await client.query(`
                    INSERT INTO questions (exam_id, text, marks)
                    VALUES ($1, $2, 1)
                    RETURNING id
                `, [srqExamId, qText]);
                
                const questionId = qResult.rows[0].id;
                
                // Insert SRQ options
                for (const optText of SRQ_OPTIONS) {
                    await client.query(`
                        INSERT INTO options (question_id, text, is_correct)
                        VALUES ($1, $2, false)
                    `, [questionId, optText]);
                }
            }
            console.log('  ✓ Inserted 29 SRQ questions with 2 options each');
        }
        
        // 6. Verify final state
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
            const expectedO = r.exam_type === 'pss' ? 50 : 58;
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
