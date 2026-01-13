require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createDebugCode() {
    const client = await pool.connect();
    try {
        const code = 'DEBUG' + Date.now().toString(36).toUpperCase();
        
        // Insert new user
        const user = await client.query(
            `INSERT INTO users (username, email, password_hash, role, profile_completed) 
             VALUES ($1, $2, 'dummy', 'candidate', false) RETURNING id`,
            ['debug_' + Date.now(), 'debug' + Date.now() + '@test.com']
        );
        const userId = user.rows[0].id;
        
        // Insert code (linked to user, exam_id NULL for all access)
        await client.query(
            `INSERT INTO candidate_codes (code, created_by, candidate_id, exam_id, is_active, max_uses, current_uses) 
             VALUES ($1, 1, $2, NULL, true, 5, 0)`,
            [code, userId]
        );
        
        console.log('=== FRESH TEST CODE ===');
        console.log('Code:', code);
        console.log('User ID:', userId);
        console.log('');
        console.log('Gunakan kode ini untuk test login fresh.');
        
    } finally {
        client.release();
        await pool.end();
    }
}

createDebugCode().catch(console.error);
