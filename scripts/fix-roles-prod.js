const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

(async () => {
    const client = await pool.connect();
    try {
        // Update admin user to have admin role
        const r1 = await client.query("UPDATE users SET role = 'admin' WHERE username = 'admin' RETURNING id, username, role");
        console.log('Updated admin:', r1.rows[0]);
        
        // Update dev.asisya.adm to be super_admin
        const r2 = await client.query("UPDATE users SET role = 'super_admin' WHERE username = 'dev.asisya.adm' RETURNING id, username, role");
        console.log('Updated dev.asisya.adm:', r2.rows[0]);
        
        // Update psikolog.adm to be psychologist
        const r2b = await client.query("UPDATE users SET role = 'psychologist' WHERE username = 'psikolog.adm' RETURNING id, username, role");
        console.log('Updated psikolog.adm:', r2b.rows[0]);
        
        // Show all non-candidate users
        const r3 = await client.query("SELECT id, username, role FROM users WHERE role != 'candidate' ORDER BY id");
        console.log('\nAll admin/psikolog users:');
        r3.rows.forEach(r => console.log('  ', r.id, r.username, r.role));
        
    } finally {
        client.release();
        await pool.end();
    }
})();
