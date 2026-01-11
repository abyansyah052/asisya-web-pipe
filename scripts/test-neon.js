// Test Neon DB Connection
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('🔌 Testing Neon DB connection...');
    console.log('URL:', process.env.DATABASE_URL?.substring(0, 60) + '...');
    
    const client = await pool.connect();
    console.log('✅ Connected to Neon!');
    
    // Test query
    const result = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('👥 Total users:', result.rows[0].count);
    
    // Check admin users
    const admins = await client.query("SELECT id, email, role FROM users WHERE role IN ('admin', 'superadmin') LIMIT 5");
    console.log('🔑 Admin users:');
    admins.rows.forEach(u => console.log('  -', u.email, '(' + u.role + ')'));
    
    client.release();
    await pool.end();
    console.log('✅ DB Test Complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }
}

test();
