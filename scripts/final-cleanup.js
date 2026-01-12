const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_iNjfX2mduDK1@ep-plain-dew-a1dxkrai-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: true });

async function finalCleanup() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('=== FINAL PSS/SRQ CLEANUP ===\n');
        
        // ==================== DELETE DUPLICATE PSS EXAMS ====================
        // Keep only the LOWEST id PSS exam (original)
        const pssExams = await client.query(`
            SELECT id FROM exams WHERE exam_type = 'pss' ORDER BY id
        `);
        console.log(`Found ${pssExams.rows.length} PSS exams`);
        
        if (pssExams.rows.length > 1) {
            const keepPssId = pssExams.rows[0].id;
            const deletePssIds = pssExams.rows.slice(1).map(e => e.id);
            
            console.log(`Keeping PSS exam ID: ${keepPssId}`);
            console.log(`Deleting PSS exam IDs: ${deletePssIds.join(', ')}`);
            
            // Delete options, questions, then exams
            for (const examId of deletePssIds) {
                await client.query('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)', [examId]);
                await client.query('DELETE FROM questions WHERE exam_id = $1', [examId]);
                await client.query('DELETE FROM exam_attempts WHERE exam_id = $1', [examId]);
                await client.query('DELETE FROM exams WHERE id = $1', [examId]);
            }
            console.log(`✅ Deleted ${deletePssIds.length} duplicate PSS exams`);
        }
        
        // ==================== DELETE DUPLICATE SRQ EXAMS ====================
        const srqExams = await client.query(`
            SELECT id FROM exams WHERE exam_type = 'srq29' ORDER BY id
        `);
        console.log(`\nFound ${srqExams.rows.length} SRQ exams`);
        
        if (srqExams.rows.length > 1) {
            const keepSrqId = srqExams.rows[0].id;
            const deleteSrqIds = srqExams.rows.slice(1).map(e => e.id);
            
            console.log(`Keeping SRQ exam ID: ${keepSrqId}`);
            console.log(`Deleting SRQ exam IDs: ${deleteSrqIds.join(', ')}`);
            
            for (const examId of deleteSrqIds) {
                await client.query('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)', [examId]);
                await client.query('DELETE FROM questions WHERE exam_id = $1', [examId]);
                await client.query('DELETE FROM exam_attempts WHERE exam_id = $1', [examId]);
                await client.query('DELETE FROM exams WHERE id = $1', [examId]);
            }
            console.log(`✅ Deleted ${deleteSrqIds.length} duplicate SRQ exams`);
        }
        
        // ==================== CLEANUP PSS QUESTIONS/OPTIONS ====================
        const pssExam = await client.query(`SELECT id FROM exams WHERE exam_type = 'pss' LIMIT 1`);
        if (pssExam.rows.length > 0) {
            const pssId = pssExam.rows[0].id;
            
            // Get all PSS questions and keep only first 10
            const pssQuestions = await client.query('SELECT id FROM questions WHERE exam_id = $1 ORDER BY id', [pssId]);
            console.log(`\nPSS has ${pssQuestions.rows.length} questions`);
            
            if (pssQuestions.rows.length > 10) {
                const deleteQIds = pssQuestions.rows.slice(10).map(q => q.id);
                await client.query('DELETE FROM options WHERE question_id = ANY($1::int[])', [deleteQIds]);
                await client.query('DELETE FROM questions WHERE id = ANY($1::int[])', [deleteQIds]);
                console.log(`✅ Deleted ${deleteQIds.length} extra PSS questions`);
            }
            
            // Cleanup options - keep only 5 per question
            const remainingPssQ = await client.query('SELECT id FROM questions WHERE exam_id = $1 ORDER BY id', [pssId]);
            for (const q of remainingPssQ.rows) {
                const opts = await client.query('SELECT id FROM options WHERE question_id = $1 ORDER BY id', [q.id]);
                if (opts.rows.length > 5) {
                    const deleteOptIds = opts.rows.slice(5).map(o => o.id);
                    await client.query('DELETE FROM options WHERE id = ANY($1::int[])', [deleteOptIds]);
                }
                // Set first option as correct
                await client.query('UPDATE options SET is_correct = FALSE WHERE question_id = $1', [q.id]);
                await client.query('UPDATE options SET is_correct = TRUE WHERE id = (SELECT id FROM options WHERE question_id = $1 ORDER BY id LIMIT 1)', [q.id]);
            }
        }
        
        // ==================== CLEANUP SRQ QUESTIONS/OPTIONS ====================
        const srqExam = await client.query(`SELECT id FROM exams WHERE exam_type = 'srq29' LIMIT 1`);
        if (srqExam.rows.length > 0) {
            const srqId = srqExam.rows[0].id;
            
            // Get all SRQ questions and keep only first 29
            const srqQuestions = await client.query('SELECT id FROM questions WHERE exam_id = $1 ORDER BY id', [srqId]);
            console.log(`SRQ has ${srqQuestions.rows.length} questions`);
            
            if (srqQuestions.rows.length > 29) {
                const deleteQIds = srqQuestions.rows.slice(29).map(q => q.id);
                await client.query('DELETE FROM options WHERE question_id = ANY($1::int[])', [deleteQIds]);
                await client.query('DELETE FROM questions WHERE id = ANY($1::int[])', [deleteQIds]);
                console.log(`✅ Deleted ${deleteQIds.length} extra SRQ questions`);
            }
            
            // Cleanup options - keep only 2 per question
            const remainingSrqQ = await client.query('SELECT id FROM questions WHERE exam_id = $1 ORDER BY id', [srqId]);
            for (const q of remainingSrqQ.rows) {
                const opts = await client.query('SELECT id FROM options WHERE question_id = $1 ORDER BY id', [q.id]);
                if (opts.rows.length > 2) {
                    const deleteOptIds = opts.rows.slice(2).map(o => o.id);
                    await client.query('DELETE FROM options WHERE id = ANY($1::int[])', [deleteOptIds]);
                }
                // Set first option as correct
                await client.query('UPDATE options SET is_correct = FALSE WHERE question_id = $1', [q.id]);
                await client.query('UPDATE options SET is_correct = TRUE WHERE id = (SELECT id FROM options WHERE question_id = $1 ORDER BY id LIMIT 1)', [q.id]);
            }
        }
        
        await client.query('COMMIT');
        
        // ==================== VERIFY ====================
        console.log('\n=== VERIFICATION ===');
        
        const finalPss = await client.query(`
            SELECT e.id, 
                   (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as q_count,
                   (SELECT COUNT(*) FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = e.id)) as o_count
            FROM exams e WHERE exam_type = 'pss'
        `);
        finalPss.rows.forEach(e => console.log(`PSS [${e.id}]: ${e.q_count} questions, ${e.o_count} options`));
        
        const finalSrq = await client.query(`
            SELECT e.id, 
                   (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as q_count,
                   (SELECT COUNT(*) FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = e.id)) as o_count
            FROM exams e WHERE exam_type = 'srq29'
        `);
        finalSrq.rows.forEach(e => console.log(`SRQ [${e.id}]: ${e.q_count} questions, ${e.o_count} options`));
        
        // Check duplicate emails
        const dupEmails = await client.query(`
            SELECT email, COUNT(*) as count FROM users GROUP BY email HAVING COUNT(*) > 1
        `);
        if (dupEmails.rows.length > 0) {
            console.log('\n⚠️ Duplicate emails found:');
            dupEmails.rows.forEach(e => console.log(`  - ${e.email}: ${e.count} times`));
        }
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

finalCleanup();
