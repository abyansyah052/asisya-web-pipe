require('dotenv').config({ path: '../.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect().then(async client => {
    await client.query('DELETE FROM exam_attempts WHERE user_id = 136');
    console.log('✅ Reset attempts for user 136 - DONE');
    client.release();
    pool.end();
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
