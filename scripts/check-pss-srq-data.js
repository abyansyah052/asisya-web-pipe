// Direct database query to check pss_category and srq_conclusion in exam_attempts
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('=== Checking exam_attempts columns ===\n');
        
        // Check column existence
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'exam_attempts' 
            AND column_name IN ('pss_category', 'srq_conclusion', 'pss_total_score', 'srq_total_yes')
        `);
        console.log('Relevant columns in exam_attempts:');
        columnsRes.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
        
        // Check PSS attempts
        console.log('\n=== PSS Exam Attempts ===');
        const pssRes = await client.query(`
            SELECT 
                ea.id, 
                COALESCE(up.full_name, u.username) as student,
                ea.score,
                ea.pss_category,
                e.exam_type
            FROM exam_attempts ea
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'pss' AND ea.status = 'completed'
            ORDER BY ea.end_time DESC
            LIMIT 5
        `);
        console.log(`Found ${pssRes.rows.length} PSS attempts:`);
        pssRes.rows.forEach(r => {
            console.log(`  - ${r.student}: score=${r.score}, category="${r.pss_category || 'NULL'}"`);
        });
        
        // Check SRQ attempts
        console.log('\n=== SRQ-29 Exam Attempts ===');
        const srqRes = await client.query(`
            SELECT 
                ea.id, 
                COALESCE(up.full_name, u.username) as student,
                ea.score,
                ea.srq_conclusion,
                e.exam_type
            FROM exam_attempts ea
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' AND ea.status = 'completed'
            ORDER BY ea.end_time DESC
            LIMIT 5
        `);
        console.log(`Found ${srqRes.rows.length} SRQ attempts:`);
        srqRes.rows.forEach(r => {
            console.log(`  - ${r.student}: score=${r.score}, conclusion="${r.srq_conclusion || 'NULL'}"`);
        });
        
        // Check for NULL categories/conclusions
        console.log('\n=== Checking for NULL values ===');
        const nullPssRes = await client.query(`
            SELECT COUNT(*) as count FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'pss' AND ea.status = 'completed' AND ea.pss_category IS NULL
        `);
        console.log(`PSS attempts with NULL pss_category: ${nullPssRes.rows[0].count}`);
        
        const nullSrqRes = await client.query(`
            SELECT COUNT(*) as count FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' AND ea.status = 'completed' AND ea.srq_conclusion IS NULL
        `);
        console.log(`SRQ attempts with NULL srq_conclusion: ${nullSrqRes.rows[0].count}`);
        
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
