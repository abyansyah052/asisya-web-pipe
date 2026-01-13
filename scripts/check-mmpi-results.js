#!/usr/bin/env node
/**
 * Check mmpi_results table
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('🔍 MMPI_RESULTS TABLE CHECK\n');
        
        // Check mmpi_results structure
        const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'mmpi_results'
            ORDER BY ordinal_position
        `);
        console.log('Columns:', cols.rows.map(r => r.column_name + '(' + r.data_type + ')').join(', '));
        
        // Check total
        const total = await client.query('SELECT COUNT(*) as cnt FROM mmpi_results');
        console.log('\nTotal rows:', total.rows[0].cnt);
        
        // Check mmpi_results data
        const data = await client.query('SELECT * FROM mmpi_results LIMIT 3');
        console.log('\nSample data:');
        for (const row of data.rows) {
            console.log(JSON.stringify(row, null, 2));
        }
        
        // Check if mmpi_results links to exam_attempts
        const linked = await client.query(`
            SELECT mr.*, ea.exam_id, e.title
            FROM mmpi_results mr
            LEFT JOIN exam_attempts ea ON mr.attempt_id = ea.id
            LEFT JOIN exams e ON ea.exam_id = e.id
            LIMIT 5
        `);
        console.log('\n\nLinked to exam_attempts:');
        for (const row of linked.rows) {
            console.log(`  attempt_id: ${row.attempt_id}, exam: ${row.title || 'N/A'}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        pool.end();
    }
}

check();
