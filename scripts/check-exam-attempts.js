require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();
    try {
        const attempts = await client.query(`
            SELECT ea.id, ea.user_id, ea.exam_id, ea.status, ea.start_time, ea.end_time,
                   u.full_name as user_name, e.title as exam_title
            FROM exam_attempts ea
            JOIN users u ON u.id = ea.user_id
            JOIN exams e ON e.id = ea.exam_id
            ORDER BY ea.created_at DESC
            LIMIT 20
        `);
        
        console.log('Recent attempts:');
        attempts.rows.forEach(a => {
            console.log(`ID: ${a.id} | User: ${a.user_name} | Exam: ${a.exam_title} | Status: ${a.status}`);
        });
        
        const exams = await client.query(`
            SELECT id, title, status, exam_type 
            FROM exams 
            WHERE exam_type IN ('pss', 'srq29')
        `);
        console.log('\nPSS/SRQ Exams:');
        exams.rows.forEach(e => {
            console.log(`ID: ${e.id} | ${e.title} | Status: ${e.status} | Type: ${e.exam_type}`);
        });
        
    } finally {
        client.release();
        pool.end();
    }
}

check();
