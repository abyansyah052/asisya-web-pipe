const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateRoles() {
  const client = await pool.connect();
  
  // Update admin (username='admin') to role 'admin'
  await client.query("UPDATE users SET role = 'admin' WHERE username = 'admin'");
  console.log('✅ admin -> role=admin');
  
  // Update dev.asisya.adm to role 'super_admin' (dengan underscore sesuai constraint)
  await client.query("UPDATE users SET role = 'super_admin' WHERE username = 'dev.asisya.adm'");
  console.log('✅ dev.asisya.adm -> role=super_admin');
  
  // Verify
  const result = await client.query("SELECT id, email, username, role FROM users WHERE username IN ('admin', 'dev.asisya.adm')");
  console.log('\nVerified:');
  result.rows.forEach(u => console.log('  ' + u.username + ' -> ' + u.role));
  
  client.release();
  await pool.end();
}
updateRoles();
