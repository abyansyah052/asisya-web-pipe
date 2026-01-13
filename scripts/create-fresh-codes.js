require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createCodes() {
    const client = await pool.connect();
    try {
        // Generate unique codes
        const code1 = 'PSS' + Date.now().toString(36).toUpperCase();
        const code2 = 'SRQ' + Date.now().toString(36).toUpperCase();
        
        // Get or create test user
        let userId;
        const existingUser = await client.query(
            "SELECT id FROM users WHERE email = 'testpetunjuk@example.com'"
        );
        
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].id;
        } else {
            // Create new user
            const newUser = await client.query(
                `INSERT INTO users (username, email, full_name, role, password_hash) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                ['testpetunjuk2', 'testpetunjuk2@example.com', 'Test Petunjuk User', 'candidate', 'dummy']
            );
            userId = newUser.rows[0].id;
        }
        
        // Insert fresh codes
        await client.query(
            `INSERT INTO candidate_codes (code, candidate_id, exam_id, is_active, max_uses, current_uses) 
             VALUES ($1, $2, 9, true, 1, 0)`,
            [code1, userId]
        );
        
        await client.query(
            `INSERT INTO candidate_codes (code, candidate_id, exam_id, is_active, max_uses, current_uses) 
             VALUES ($1, $2, 10, true, 1, 0)`,
            [code2, userId]
        );
        
        console.log('=== KODE PESERTA BARU ===');
        console.log('PSS: ' + code1);
        console.log('SRQ: ' + code2);
        console.log('User ID: ' + userId);
        
    } finally {
        client.release();
        await pool.end();
    }
}

createCodes().catch(console.error);
