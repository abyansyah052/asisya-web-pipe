const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

(async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Fix user 74 role to candidate and is_active to true
        const fix = await client.query("UPDATE users SET role = 'candidate', is_active = true WHERE id = 74 RETURNING id, username, role, is_active");
        console.log('Fixed user 74:', fix.rows[0]);
        
        // Link candidate code to user 74
        const link = await client.query("UPDATE candidate_codes SET candidate_id = 74, current_uses = 1, used_at = NOW() WHERE code = '0126-0000-0002' RETURNING id, code, candidate_id");
        console.log('Linked code:', link.rows[0]);
        
        // Create user profile if not exists
        const prof = await client.query(`
            INSERT INTO user_profiles (user_id, full_name)
            VALUES (74, 'Test Candidate Flow')
            ON CONFLICT (user_id) DO UPDATE SET full_name = 'Test Candidate Flow'
            RETURNING *
        `);
        console.log('Profile:', prof.rows[0]);
        
        await client.query('COMMIT');
        console.log('\nDone!');
        
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
})();
