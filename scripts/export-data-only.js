/**
 * Export Data Only Script (TRUNCATE + INSERT)
 * ============================================
 * Export data saja dari Neon DB untuk sync ke VPS
 * Tidak drop table, hanya truncate dan insert
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

async function exportData() {
    console.log('📦 Export Data Only (TRUNCATE + INSERT)');
    console.log('='.repeat(60));

    const client = await pool.connect();
    const outputFile = path.join(__dirname, '..', 'database-data-vps.sql');
    let sql = [];

    try {
        sql.push('-- ============================================');
        sql.push('-- ASISYA - Data Export (TRUNCATE + INSERT)');
        sql.push('-- Generated: ' + new Date().toISOString());
        sql.push('-- Mode: Truncate all tables, then insert data');
        sql.push('-- ============================================');
        sql.push('');

        // Order tables by foreign key dependencies (children first for truncate)
        const tableOrder = [
            'exam_answers',
            'exam_attempts',
            'candidate_groups',
            'candidate_codes',
            'code_sequences',
            'options',
            'questions',
            'exams',
            'user_profiles',
            'users',
            'company_codes',
            'site_settings',
            'branding_presets',
            'branding_access',
            'admin_quotas',
            'organizations',
            'exam_assessors',
            '_migrations'
        ];

        // Get all tables
        const tablesRes = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        const allTables = tablesRes.rows.map(r => r.table_name);

        // Sort tables
        const sortedTables = [...tableOrder.filter(t => allTables.includes(t)), 
                             ...allTables.filter(t => !tableOrder.includes(t))];

        // TRUNCATE all tables (CASCADE to handle FK)
        sql.push('-- Disable triggers temporarily');
        sql.push('SET session_replication_role = replica;');
        sql.push('');
        sql.push('-- TRUNCATE all tables');
        
        for (const table of sortedTables) {
            sql.push(`TRUNCATE TABLE ${table} CASCADE;`);
        }
        sql.push('');

        // Insert order (parents first)
        const insertOrder = [
            'organizations',
            'users',
            'user_profiles',
            'exams',
            'questions',
            'options',
            'exam_attempts',
            'exam_answers',
            'candidate_codes',
            'candidate_groups',
            'code_sequences',
            'company_codes',
            'site_settings',
            'branding_presets',
            'branding_access',
            'admin_quotas',
            'exam_assessors',
            '_migrations'
        ];

        const insertTables = [...insertOrder.filter(t => allTables.includes(t)),
                             ...allTables.filter(t => !insertOrder.includes(t))];

        // Export data
        console.log('📊 Exporting data...');
        sql.push('-- INSERT DATA');
        sql.push('');

        for (const table of insertTables) {
            const countRes = await client.query(`SELECT COUNT(*) FROM ${table}`);
            const rowCount = parseInt(countRes.rows[0].count);
            
            if (rowCount === 0) {
                console.log(`   ⏭️  ${table}: 0 rows`);
                continue;
            }

            sql.push(`-- ${table}: ${rowCount} rows`);
            
            const dataRes = await client.query(`SELECT * FROM ${table}`);
            
            if (dataRes.rows.length > 0) {
                const columns = Object.keys(dataRes.rows[0]);
                
                for (const row of dataRes.rows) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        if (typeof val === 'number') return val;
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return `'${String(val).replace(/'/g, "''")}'`;
                    });
                    
                    sql.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
                }
            }
            
            sql.push('');
            console.log(`   ✅ ${table}: ${rowCount} rows`);
        }

        // Reset sequences
        sql.push('-- Reset sequences');
        for (const table of insertTables) {
            const seqRes = await client.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = $1 AND column_default LIKE 'nextval%'
            `, [table]);

            for (const seq of seqRes.rows) {
                const maxRes = await client.query(`SELECT COALESCE(MAX(${seq.column_name}), 0) + 1 as next FROM ${table}`);
                sql.push(`SELECT setval('${table}_${seq.column_name}_seq', ${maxRes.rows[0].next}, false);`);
            }
        }

        sql.push('');
        sql.push('-- Re-enable triggers');
        sql.push('SET session_replication_role = DEFAULT;');
        sql.push('');
        sql.push('-- DONE');

        fs.writeFileSync(outputFile, sql.join('\n'), 'utf8');
        
        console.log('');
        console.log('='.repeat(60));
        console.log('✅ Export completed!');
        console.log(`📄 Output: ${outputFile}`);

    } finally {
        client.release();
        await pool.end();
    }
}

exportData().catch(console.error);
