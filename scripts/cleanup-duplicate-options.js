const { Pool } = require('pg');

// Use Vercel Postgres connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_iNjfX2mduDK1@ep-plain-dew-a1dxkrai-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: true
});

async function cleanupDuplicateOptions() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('=== Cleaning up duplicate options ===\n');
        
        // For PSS (exam_id = 9) - keep only first 5 options per question
        const pssQuestions = await client.query('SELECT id FROM questions WHERE exam_id = 9 ORDER BY id');
        console.log(`PSS has ${pssQuestions.rows.length} questions`);
        
        for (const q of pssQuestions.rows) {
            const options = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id',
                [q.id]
            );
            
            if (options.rows.length > 5) {
                // Keep first 5, delete rest
                const keepIds = options.rows.slice(0, 5).map(o => o.id);
                const deleteIds = options.rows.slice(5).map(o => o.id);
                
                await client.query(
                    'DELETE FROM options WHERE id = ANY($1::int[])',
                    [deleteIds]
                );
                console.log(`  Question ${q.id}: Deleted ${deleteIds.length} duplicate options, kept ${keepIds.length}`);
            }
        }
        
        // For SRQ (exam_id = 10) - keep only first 2 options per question
        const srqQuestions = await client.query('SELECT id FROM questions WHERE exam_id = 10 ORDER BY id');
        console.log(`\nSRQ has ${srqQuestions.rows.length} questions`);
        
        for (const q of srqQuestions.rows) {
            const options = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id',
                [q.id]
            );
            
            if (options.rows.length > 2) {
                // Keep first 2, delete rest
                const keepIds = options.rows.slice(0, 2).map(o => o.id);
                const deleteIds = options.rows.slice(2).map(o => o.id);
                
                await client.query(
                    'DELETE FROM options WHERE id = ANY($1::int[])',
                    [deleteIds]
                );
                console.log(`  Question ${q.id}: Deleted ${deleteIds.length} duplicate options, kept ${keepIds.length}`);
            }
        }
        
        // Also set the first option as "correct" for validation purposes
        // PSS: first option (0 - Tidak pernah) as default correct
        console.log('\n=== Setting default correct options for validation ===');
        
        for (const q of pssQuestions.rows) {
            const firstOpt = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id LIMIT 1',
                [q.id]
            );
            if (firstOpt.rows.length > 0) {
                await client.query(
                    'UPDATE options SET is_correct = TRUE WHERE id = $1',
                    [firstOpt.rows[0].id]
                );
            }
        }
        console.log('PSS: Set first option as correct for all questions');
        
        // SRQ: first option (Ya) as default correct
        for (const q of srqQuestions.rows) {
            const firstOpt = await client.query(
                'SELECT id FROM options WHERE question_id = $1 ORDER BY id LIMIT 1',
                [q.id]
            );
            if (firstOpt.rows.length > 0) {
                await client.query(
                    'UPDATE options SET is_correct = TRUE WHERE id = $1',
                    [firstOpt.rows[0].id]
                );
            }
        }
        console.log('SRQ: Set first option as correct for all questions');
        
        await client.query('COMMIT');
        
        // Verify final counts
        const pssOptCount = await client.query(`
            SELECT COUNT(*) FROM options WHERE question_id IN 
            (SELECT id FROM questions WHERE exam_id = 9)
        `);
        console.log(`\n✅ Final PSS options: ${pssOptCount.rows[0].count} (expected: 50)`);
        
        const srqOptCount = await client.query(`
            SELECT COUNT(*) FROM options WHERE question_id IN 
            (SELECT id FROM questions WHERE exam_id = 10)
        `);
        console.log(`✅ Final SRQ options: ${srqOptCount.rows[0].count} (expected: 58)`);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

cleanupDuplicateOptions();
