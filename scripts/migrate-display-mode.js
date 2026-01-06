// Simple migration script
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asisya'
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running migration: Add display_mode column to exams table...');
        
        // Check if column exists
        const checkResult = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'exams' AND column_name = 'display_mode'
        `);
        
        if (checkResult.rows.length === 0) {
            await client.query(`
                ALTER TABLE exams ADD COLUMN display_mode VARCHAR(20) DEFAULT 'per_page'
            `);
            console.log('✅ Column display_mode added successfully');
        } else {
            console.log('ℹ️ Column display_mode already exists');
        }
        
        // Verify
        const verifyResult = await client.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'exams' AND column_name = 'display_mode'
        `);
        console.log('Column info:', verifyResult.rows[0]);
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
