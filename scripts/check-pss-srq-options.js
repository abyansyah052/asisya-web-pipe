const { Pool } = require('pg');

// Use Vercel Postgres connection string directly
const DATABASE_URL = 'postgresql://neondb_owner:npg_iNjfX2mduDK1@ep-plain-dew-a1dxkrai-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: true
});

async function checkOptions() {
    const client = await pool.connect();
    try {
        // Check PSS questions and options
        console.log('\n=== PSS (Exam ID 9) ===');
        const pssQ = await client.query('SELECT id, text FROM questions WHERE exam_id = 9 ORDER BY id LIMIT 3');
        console.log('PSS Questions (first 3):');
        pssQ.rows.forEach(q => console.log(`  - [${q.id}] ${q.text.substring(0, 50)}...`));
        
        if (pssQ.rows.length > 0) {
            const qId = pssQ.rows[0].id;
            const opts = await client.query('SELECT id, text, is_correct FROM options WHERE question_id = $1 ORDER BY id', [qId]);
            console.log(`\nOptions for question ${qId}:`);
            opts.rows.forEach(o => console.log(`  - [${o.id}] ${o.text} (correct: ${o.is_correct})`));
        }
        
        // Check SRQ questions and options
        console.log('\n=== SRQ (Exam ID 10) ===');
        const srqQ = await client.query('SELECT id, text FROM questions WHERE exam_id = 10 ORDER BY id LIMIT 3');
        console.log('SRQ Questions (first 3):');
        srqQ.rows.forEach(q => console.log(`  - [${q.id}] ${q.text.substring(0, 50)}...`));
        
        if (srqQ.rows.length > 0) {
            const qId = srqQ.rows[0].id;
            const opts = await client.query('SELECT id, text, is_correct FROM options WHERE question_id = $1 ORDER BY id', [qId]);
            console.log(`\nOptions for question ${qId}:`);
            opts.rows.forEach(o => console.log(`  - [${o.id}] ${o.text} (correct: ${o.is_correct})`));
        }
        
        // Count total options
        const pssOptCount = await client.query(`
            SELECT COUNT(*) FROM options WHERE question_id IN 
            (SELECT id FROM questions WHERE exam_id = 9)
        `);
        console.log(`\nTotal PSS options: ${pssOptCount.rows[0].count}`);
        
        const srqOptCount = await client.query(`
            SELECT COUNT(*) FROM options WHERE question_id IN 
            (SELECT id FROM questions WHERE exam_id = 10)
        `);
        console.log(`Total SRQ options: ${srqOptCount.rows[0].count}`);
        
    } finally {
        client.release();
        pool.end();
    }
}

checkOptions().catch(console.error);
