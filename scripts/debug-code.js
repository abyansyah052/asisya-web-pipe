require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    const client = await pool.connect();
    try {
        // Cari kode yang mirip 0126 0000 0013
        console.log('=== Mencari kode ===');
        const codes = await client.query(`
            SELECT cc.*, u.full_name, u.id as user_id, e.title, e.status as exam_status 
            FROM candidate_codes cc 
            LEFT JOIN users u ON u.id = cc.candidate_id 
            LEFT JOIN exams e ON e.id = cc.exam_id 
            ORDER BY cc.created_at DESC 
            LIMIT 10
        `);
        
        codes.rows.forEach(c => {
            console.log('\nCode:', c.code);
            console.log('  User ID:', c.user_id, '| Name:', c.full_name);
            console.log('  Exam ID:', c.exam_id, '| Title:', c.title);
            console.log('  Exam Status:', c.exam_status);
            console.log('  Is Active:', c.is_active);
            console.log('  Max Uses:', c.max_uses, '| Current:', c.current_uses);
        });
        
        // Cek exam attempts untuk user terbaru
        console.log('\n\n=== Recent Attempts ===');
        const attempts = await client.query(`
            SELECT ea.*, u.full_name, e.title 
            FROM exam_attempts ea 
            JOIN users u ON u.id = ea.user_id 
            JOIN exams e ON e.id = ea.exam_id 
            ORDER BY ea.created_at DESC 
            LIMIT 5
        `);
        
        attempts.rows.forEach(a => {
            console.log('\nAttempt ID:', a.id);
            console.log('  User:', a.full_name, '(ID:', a.user_id + ')');
            console.log('  Exam:', a.title, '(ID:', a.exam_id + ')');
            console.log('  Status:', a.status);
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

debug().catch(console.error);
