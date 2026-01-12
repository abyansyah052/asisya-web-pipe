/**
 * Delete duplicate PSS/SRQ exams, keep only exam 9 (PSS) and 10 (SRQ)
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function main() {
    const client = await pool.connect();
    try {
        // Check for duplicate PSS/SRQ exams
        const check = await client.query(`
            SELECT id, title, exam_type, 
                   (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as q_count
            FROM exams e
            WHERE exam_type IN ('pss', 'srq29')
            ORDER BY id
        `);
        
        console.log('Found PSS/SRQ exams:');
        check.rows.forEach(r => console.log(`  ID ${r.id}: ${r.title} (${r.exam_type}) - ${r.q_count} questions`));
        
        // Delete duplicate exams (keep 9 for PSS, 10 for SRQ)
        const duplicates = check.rows.filter(r => 
            (r.exam_type === 'pss' && r.id !== 9) ||
            (r.exam_type === 'srq29' && r.id !== 10)
        );
        
        if (duplicates.length > 0) {
            console.log('\nDeleting duplicates:', duplicates.map(d => d.id).join(', '));
            for (const dup of duplicates) {
                // Delete related data first
                await client.query('DELETE FROM exam_answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)', [dup.id]);
                await client.query('DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)', [dup.id]);
                await client.query('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = $1)', [dup.id]);
                await client.query('DELETE FROM questions WHERE exam_id = $1', [dup.id]);
                await client.query('DELETE FROM exam_attempts WHERE exam_id = $1', [dup.id]);
                await client.query('DELETE FROM candidate_groups WHERE exam_id = $1', [dup.id]);
                await client.query('DELETE FROM exams WHERE id = $1', [dup.id]);
                console.log(`  Deleted exam ${dup.id}`);
            }
            console.log('✅ Duplicates deleted');
        } else {
            console.log('\n✅ No duplicates found.');
        }
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
