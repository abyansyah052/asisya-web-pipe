const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    // 1. Check if code_sequences table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'code_sequences'
      ) as exists
    `);
    console.log('=== code_sequences table exists:', tableCheck.rows[0].exists);
    
    // 2. Check function exists
    const funcCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc WHERE proname = 'get_next_code_number'
      ) as exists
    `);
    console.log('=== get_next_code_number function exists:', funcCheck.rows[0].exists);
    
    // 3. Show code_sequences content if exists
    if (tableCheck.rows[0].exists) {
      const seqData = await client.query('SELECT * FROM code_sequences ORDER BY updated_at DESC LIMIT 10');
      console.log('\n=== code_sequences data (top 10):');
      console.table(seqData.rows);
    } else {
      console.log('\n>>> Table code_sequences BELUM ADA di database!');
      console.log('>>> Jalankan migration 011_code_sequences.sql untuk create table');
    }
    
    // 4. Check indexes on candidate_codes
    const indexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'candidate_codes'
    `);
    console.log('\n=== Indexes on candidate_codes:');
    indexes.rows.forEach(r => console.log('-', r.indexname));
    
  } finally {
    client.release();
    pool.end();
  }
}
check().catch(console.error);
