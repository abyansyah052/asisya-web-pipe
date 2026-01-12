const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

(async () => {
    const client = await pool.connect();
    try {
        // Get user 74 details
        const u = await client.query("SELECT * FROM users WHERE id = 74");
        console.log('User 74:', u.rows[0]);
        
        // Get candidate profile
        const up = await client.query("SELECT * FROM user_profiles WHERE user_id = 74");
        console.log('User profile:', up.rows[0]);
        
        // Get candidate code
        const cc = await client.query("SELECT * FROM candidate_codes WHERE code = '0126-0000-0002'");
        console.log('Candidate code:', cc.rows[0]);
        
        // Fix: Update user role to candidate and status to active
        const fix = await client.query("UPDATE users SET role = 'candidate', status = 'active' WHERE id = 74 RETURNING id, username, role, status");
        console.log('\nFixed user 74:', fix.rows[0]);
        
    } finally {
        client.release();
        await pool.end();
    }
})();
