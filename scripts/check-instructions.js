require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT id, title, instructions FROM exams WHERE id IN (9, 10)"
        );
        
        result.rows.forEach(e => {
            console.log(`\n=== ${e.title} (ID: ${e.id}) ===`);
            console.log(e.instructions || '(kosong)');
        });
        
    } finally {
        client.release();
        pool.end();
    }
}

check();
