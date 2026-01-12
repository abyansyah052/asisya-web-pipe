const { Pool } = require('pg');

// Use Vercel Postgres connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_iNjfX2mduDK1@ep-plain-dew-a1dxkrai-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: true
});

async function fullCleanup() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('=== FULL PSS/SRQ CLEANUP ===\n');
        
        // ==================== PSS CLEANUP ====================
        console.log('=== PSS (Exam ID 9) ===');
        
        // Get all PSS questions
        const pssQuestions = await client.query(
            'SELECT id FROM questions WHERE exam_id = 9 ORDER BY id'
        );
        console.log(`Current PSS questions: ${pssQuestions.rows.length}`);
        
        if (pssQuestions.rows.length > 10) {
            // Keep first 10 questions, delete rest
            const keepPssQIds = pssQuestions.rows.slice(0, 10).map(q => q.id);
            const deletePssQIds = pssQuestions.rows.slice(10).map(q => q.id);
            
            console.log(`Keeping questions: ${keepPssQIds.join(', ')}`);
            console.log(`Deleting questions: ${deletePssQIds.join(', ')}`);
            
            // Delete options for questions to be deleted
            await client.query(
                'DELETE FROM options WHERE question_id = ANY($1::int[])',
                [deletePssQIds]
            );
            
            // Delete extra questions
            await client.query(
                'DELETE FROM questions WHERE id = ANY($1::int[])',
                [deletePssQIds]
            );
            
            console.log(`✅ Deleted ${deletePssQIds.length} extra PSS questions`);
        }
        
        // Now cleanup options for remaining 10 questions
        const remainingPssQ = await client.query(
            'SELECT id FROM questions WHERE exam_id = 9 ORDER BY id'
        );
        
        for (const q of remainingPssQ.rows) {
            const options = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id',
                [q.id]
            );
            
            if (options.rows.length > 5) {
                const deleteOptIds = options.rows.slice(5).map(o => o.id);
                await client.query(
                    'DELETE FROM options WHERE id = ANY($1::int[])',
                    [deleteOptIds]
                );
                console.log(`  Question ${q.id}: Deleted ${deleteOptIds.length} extra options`);
            }
            
            // Set first option as correct for validation
            const firstOpt = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id LIMIT 1',
                [q.id]
            );
            if (firstOpt.rows.length > 0) {
                await client.query(
                    'UPDATE options SET is_correct = FALSE WHERE question_id = $1',
                    [q.id]
                );
                await client.query(
                    'UPDATE options SET is_correct = TRUE WHERE id = $1',
                    [firstOpt.rows[0].id]
                );
            }
        }
        
        // ==================== SRQ CLEANUP ====================
        console.log('\n=== SRQ (Exam ID 10) ===');
        
        // Get all SRQ questions
        const srqQuestions = await client.query(
            'SELECT id FROM questions WHERE exam_id = 10 ORDER BY id'
        );
        console.log(`Current SRQ questions: ${srqQuestions.rows.length}`);
        
        if (srqQuestions.rows.length > 29) {
            // Keep first 29 questions, delete rest
            const keepSrqQIds = srqQuestions.rows.slice(0, 29).map(q => q.id);
            const deleteSrqQIds = srqQuestions.rows.slice(29).map(q => q.id);
            
            console.log(`Keeping first 29 questions`);
            console.log(`Deleting ${deleteSrqQIds.length} extra questions`);
            
            // Delete options for questions to be deleted
            await client.query(
                'DELETE FROM options WHERE question_id = ANY($1::int[])',
                [deleteSrqQIds]
            );
            
            // Delete extra questions
            await client.query(
                'DELETE FROM questions WHERE id = ANY($1::int[])',
                [deleteSrqQIds]
            );
            
            console.log(`✅ Deleted ${deleteSrqQIds.length} extra SRQ questions`);
        }
        
        // Now cleanup options for remaining 29 questions
        const remainingSrqQ = await client.query(
            'SELECT id FROM questions WHERE exam_id = 10 ORDER BY id'
        );
        
        for (const q of remainingSrqQ.rows) {
            const options = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id',
                [q.id]
            );
            
            if (options.rows.length > 2) {
                const deleteOptIds = options.rows.slice(2).map(o => o.id);
                await client.query(
                    'DELETE FROM options WHERE id = ANY($1::int[])',
                    [deleteOptIds]
                );
                console.log(`  Question ${q.id}: Deleted ${deleteOptIds.length} extra options`);
            }
            
            // Set first option (Ya) as correct for validation
            const firstOpt = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id LIMIT 1',
                [q.id]
            );
            if (firstOpt.rows.length > 0) {
                await client.query(
                    'UPDATE options SET is_correct = FALSE WHERE question_id = $1',
                    [q.id]
                );
                await client.query(
                    'UPDATE options SET is_correct = TRUE WHERE id = $1',
                    [firstOpt.rows[0].id]
                );
            }
        }
        
        await client.query('COMMIT');
        
        // ==================== VERIFY ====================
        console.log('\n=== VERIFICATION ===');
        
        const finalPssQ = await client.query('SELECT COUNT(*) FROM questions WHERE exam_id = 9');
        const finalPssO = await client.query(`
            SELECT COUNT(*) FROM options WHERE question_id IN 
            (SELECT id FROM questions WHERE exam_id = 9)
        `);
        console.log(`PSS: ${finalPssQ.rows[0].count} questions, ${finalPssO.rows[0].count} options (expected: 10 questions, 50 options)`);
        
        const finalSrqQ = await client.query('SELECT COUNT(*) FROM questions WHERE exam_id = 10');
        const finalSrqO = await client.query(`
            SELECT COUNT(*) FROM options WHERE question_id IN 
            (SELECT id FROM questions WHERE exam_id = 10)
        `);
        console.log(`SRQ: ${finalSrqQ.rows[0].count} questions, ${finalSrqO.rows[0].count} options (expected: 29 questions, 58 options)`);
        
        // Check is_correct status
        const pssCorrect = await client.query(`
            SELECT COUNT(*) FROM options 
            WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 9)
            AND is_correct = TRUE
        `);
        console.log(`PSS correct options: ${pssCorrect.rows[0].count} (should be 10)`);
        
        const srqCorrect = await client.query(`
            SELECT COUNT(*) FROM options 
            WHERE question_id IN (SELECT id FROM questions WHERE exam_id = 10)
            AND is_correct = TRUE
        `);
        console.log(`SRQ correct options: ${srqCorrect.rows[0].count} (should be 29)`);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

fullCleanup();
