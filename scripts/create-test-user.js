require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function main() {
    const client = await pool.connect();
    try {
        // Hash password
        const password = await bcrypt.hash('test123', 10);
        
        // Create new candidate user
        const userResult = await client.query(`
            INSERT INTO users (full_name, username, email, password_hash, role, is_active, profile_completed)
            VALUES ('Test Petunjuk User', 'testpetunjuk', 'testpetunjuk@example.com', $1, 'candidate', true, true)
            ON CONFLICT (email) DO UPDATE SET full_name = 'Test Petunjuk User'
            RETURNING id, full_name, email
        `, [password]);
        
        const user = userResult.rows[0];
        console.log('✅ User created/updated:', user);
        
        // Create candidate code for this user to access PSS exam (id=9)
        const codeResult = await client.query(`
            INSERT INTO candidate_codes (code, candidate_id, exam_id, is_active, created_by)
            VALUES ('TEST-PETUNJUK', $1, 9, true, 10)
            ON CONFLICT (code) DO UPDATE SET candidate_id = $1, exam_id = 9, is_active = true
            RETURNING code, exam_id
        `, [user.id]);
        
        console.log('✅ Candidate code PSS:', codeResult.rows[0]);
        
        // Also give access to SRQ exam (id=10)
        const codeResult2 = await client.query(`
            INSERT INTO candidate_codes (code, candidate_id, exam_id, is_active, created_by)
            VALUES ('TEST-SRQ', $1, 10, true, 10)
            ON CONFLICT (code) DO UPDATE SET candidate_id = $1, exam_id = 10, is_active = true
            RETURNING code, exam_id
        `, [user.id]);
        
        console.log('✅ Candidate code SRQ:', codeResult2.rows[0]);
        
        // Check if there are any existing attempts for this user
        const attempts = await client.query(`
            SELECT ea.id, e.title, ea.status FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE ea.user_id = $1
        `, [user.id]);
        
        if (attempts.rows.length > 0) {
            console.log('⚠️ Existing attempts:', attempts.rows);
            // Delete existing attempts for fresh test
            await client.query('DELETE FROM exam_attempts WHERE user_id = $1', [user.id]);
            console.log('🗑️ Deleted existing attempts for fresh test');
        }
        
        console.log('\n📋 Login credentials:');
        console.log('   Email: testpetunjuk@example.com');
        console.log('   Password: test123');
        console.log('\n🔗 Test URLs (after login):');
        console.log('   PSS: http://localhost:3000/candidate/exam/9');
        console.log('   SRQ: http://localhost:3000/candidate/exam/10');
        console.log('\n💡 Login page: http://localhost:3000/login');
        
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

main();
