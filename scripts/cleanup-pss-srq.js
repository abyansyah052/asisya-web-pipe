/**
 * Script untuk cleanup duplikat PSS dan SRQ
 * PSS seharusnya 10 soal, SRQ seharusnya 29 soal
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanup() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🧹 Cleaning up PSS and SRQ duplicates...\n');
        
        // 1. Check current state
        console.log('📊 Current state:');
        const exams = await client.query(`
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
        exams.rows.forEach(r => {
            console.log(`  Exam ${r.id}: ${r.exam_type} - ${r.question_count} questions, ${r.option_count} options`);
        });
        
        // 2. Delete duplicate exams (keep only id 9 for PSS and id 10 for SRQ)
        console.log('\n🗑️ Deleting duplicate exams (keeping id 9 for PSS, id 10 for SRQ)...');
        
        // First delete options for duplicate exams
        await client.query(`
            DELETE FROM options 
            WHERE question_id IN (
                SELECT id FROM questions WHERE exam_id IN (11, 12, 13, 14, 15, 16)
            )
        `);
        console.log('  ✓ Deleted options for duplicate exams');
        
        // Delete questions for duplicate exams
        await client.query(`
            DELETE FROM questions WHERE exam_id IN (11, 12, 13, 14, 15, 16)
        `);
        console.log('  ✓ Deleted questions for duplicate exams');
        
        // Delete duplicate exams
        await client.query(`
            DELETE FROM exams WHERE id IN (11, 12, 13, 14, 15, 16)
        `);
        console.log('  ✓ Deleted duplicate exams');
        
        // 3. Clean up duplicate questions in PSS (exam_id = 9)
        console.log('\n🧹 Cleaning duplicate questions in PSS (exam 9)...');
        
        // Get unique questions by text (keep lowest id)
        const pssQuestions = await client.query(`
            SELECT MIN(id) as keep_id, text
            FROM questions
            WHERE exam_id = 9
            GROUP BY text
        `);
        
        const pssKeepIds = pssQuestions.rows.map(r => r.keep_id);
        console.log(`  Found ${pssKeepIds.length} unique PSS questions to keep: ${pssKeepIds.join(', ')}`);
        
        // Delete options for duplicate questions
        await client.query(`
            DELETE FROM options 
            WHERE question_id IN (
                SELECT id FROM questions 
                WHERE exam_id = 9 AND id NOT IN (${pssKeepIds.join(',')})
            )
        `);
        
        // Delete duplicate questions
        const deletedPssQ = await client.query(`
            DELETE FROM questions 
            WHERE exam_id = 9 AND id NOT IN (${pssKeepIds.join(',')})
            RETURNING id
        `);
        console.log(`  ✓ Deleted ${deletedPssQ.rowCount} duplicate PSS questions`);
        
        // 4. Clean up duplicate options for remaining PSS questions
        console.log('\n🧹 Cleaning duplicate options for PSS questions...');
        for (const qid of pssKeepIds) {
            // Keep only unique options (by text, keep lowest id)
            const options = await client.query(`
                SELECT MIN(id) as keep_id, text
                FROM options
                WHERE question_id = $1
                GROUP BY text
            `, [qid]);
            
            const keepOptionIds = options.rows.map(r => r.keep_id);
            
            if (keepOptionIds.length > 0) {
                const deleted = await client.query(`
                    DELETE FROM options 
                    WHERE question_id = $1 AND id NOT IN (${keepOptionIds.join(',')})
                    RETURNING id
                `, [qid]);
                
                if (deleted.rowCount > 0) {
                    console.log(`  Q${qid}: deleted ${deleted.rowCount} duplicate options, kept ${keepOptionIds.length}`);
                }
            }
        }
        
        // 5. Clean up duplicate questions in SRQ (exam_id = 10)
        console.log('\n🧹 Cleaning duplicate questions in SRQ (exam 10)...');
        
        const srqQuestions = await client.query(`
            SELECT MIN(id) as keep_id, text
            FROM questions
            WHERE exam_id = 10
            GROUP BY text
        `);
        
        const srqKeepIds = srqQuestions.rows.map(r => r.keep_id);
        console.log(`  Found ${srqKeepIds.length} unique SRQ questions to keep`);
        
        // Delete options for duplicate questions
        await client.query(`
            DELETE FROM options 
            WHERE question_id IN (
                SELECT id FROM questions 
                WHERE exam_id = 10 AND id NOT IN (${srqKeepIds.join(',')})
            )
        `);
        
        // Delete duplicate questions
        const deletedSrqQ = await client.query(`
            DELETE FROM questions 
            WHERE exam_id = 10 AND id NOT IN (${srqKeepIds.join(',')})
            RETURNING id
        `);
        console.log(`  ✓ Deleted ${deletedSrqQ.rowCount} duplicate SRQ questions`);
        
        // 6. Clean up duplicate options for remaining SRQ questions
        console.log('\n🧹 Cleaning duplicate options for SRQ questions...');
        for (const qid of srqKeepIds) {
            const options = await client.query(`
                SELECT MIN(id) as keep_id, text
                FROM options
                WHERE question_id = $1
                GROUP BY text
            `, [qid]);
            
            const keepOptionIds = options.rows.map(r => r.keep_id);
            
            if (keepOptionIds.length > 0) {
                const deleted = await client.query(`
                    DELETE FROM options 
                    WHERE question_id = $1 AND id NOT IN (${keepOptionIds.join(',')})
                    RETURNING id
                `, [qid]);
                
                if (deleted.rowCount > 0) {
                    console.log(`  Q${qid}: deleted ${deleted.rowCount} duplicate options, kept ${keepOptionIds.length}`);
                }
            }
        }
        
        // 7. Verify final state
        console.log('\n📊 Final state:');
        const finalExams = await client.query(`
            SELECT e.id, e.title, e.exam_type, 
                   COUNT(DISTINCT q.id) as question_count,
                   COUNT(DISTINCT qo.id) as option_count
            FROM exams e
            LEFT JOIN questions q ON q.exam_id = e.id
            LEFT JOIN options qo ON qo.question_id = q.id
            WHERE e.exam_type IN ('pss', 'srq29')
            GROUP BY e.id, e.title, e.exam_type
            ORDER BY e.id
        `);
        finalExams.rows.forEach(r => {
            const expected = r.exam_type === 'pss' ? 10 : 29;
            const status = r.question_count == expected ? '✅' : '❌';
            console.log(`  ${status} Exam ${r.id}: ${r.exam_type} - ${r.question_count} questions (expected: ${expected}), ${r.option_count} options`);
        });
        
        await client.query('COMMIT');
        console.log('\n✅ Cleanup completed successfully!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
