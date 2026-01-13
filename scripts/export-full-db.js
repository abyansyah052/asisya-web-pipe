/**
 * Export Full Database Script
 * ===========================
 * Export schema + data dari Neon DB untuk migrasi ke VPS PostgreSQL
 * 
 * Usage: node scripts/export-full-db.js
 * Output: database-full-vps.sql (siap import ke VPS)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

async function exportDatabase() {
    console.log('📦 Export Full Database for VPS Migration');
    console.log('='.repeat(60));
    console.log('');

    const client = await pool.connect();
    const outputFile = path.join(__dirname, '..', 'database-full-vps.sql');
    let sql = [];

    try {
        // Header
        sql.push('-- ============================================');
        sql.push('-- ASISYA ASSESSMENT - Full Database Export');
        sql.push('-- Generated: ' + new Date().toISOString());
        sql.push('-- Source: Neon DB (Staging)');
        sql.push('-- Target: VPS PostgreSQL (Production)');
        sql.push('-- ============================================');
        sql.push('');
        sql.push('-- Run with: psql -U postgres -d asisya_db -f database-full-vps.sql');
        sql.push('');
        sql.push('BEGIN;');
        sql.push('');

        // 1. Get all tables in order (respect foreign keys)
        console.log('📋 Getting table list...');
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`   Found ${tables.length} tables`);

        // Define order for foreign key constraints
        const tableOrder = [
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
            'logo_history',
            'branding_presets',
            'migrations'
        ];

        // Sort tables by order, unknown tables at end
        const sortedTables = tables.sort((a, b) => {
            const aIdx = tableOrder.indexOf(a);
            const bIdx = tableOrder.indexOf(b);
            if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
        });

        // 2. Export table schemas
        console.log('');
        console.log('📐 Exporting table schemas...');
        sql.push('-- ============================================');
        sql.push('-- PART 1: TABLE SCHEMAS');
        sql.push('-- ============================================');
        sql.push('');

        for (const table of sortedTables) {
            // Get columns
            const columnsRes = await client.query(`
                SELECT column_name, data_type, character_maximum_length, 
                       column_default, is_nullable, udt_name
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [table]);

            // Get primary key
            const pkRes = await client.query(`
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = $1::regclass AND i.indisprimary
            `, [table]);
            const pkColumns = pkRes.rows.map(r => r.attname);

            // Build CREATE TABLE
            sql.push(`-- Table: ${table}`);
            sql.push(`DROP TABLE IF EXISTS ${table} CASCADE;`);
            
            let createSql = `CREATE TABLE ${table} (\n`;
            const colDefs = [];
            
            for (const col of columnsRes.rows) {
                let colType = col.data_type.toUpperCase();
                if (col.character_maximum_length) {
                    colType = `VARCHAR(${col.character_maximum_length})`;
                }
                if (col.udt_name === 'timestamptz') colType = 'TIMESTAMPTZ';
                if (col.udt_name === 'int4') colType = 'INTEGER';
                if (col.udt_name === 'int8') colType = 'BIGINT';
                if (col.udt_name === 'bool') colType = 'BOOLEAN';
                if (col.udt_name === 'numeric') colType = 'NUMERIC';
                if (col.udt_name === 'jsonb') colType = 'JSONB';
                if (col.udt_name === 'json') colType = 'JSON';
                
                let def = `    ${col.column_name} ${colType}`;
                if (col.column_default && col.column_default.includes('nextval')) {
                    def = `    ${col.column_name} SERIAL`;
                } else if (col.column_default) {
                    def += ` DEFAULT ${col.column_default}`;
                }
                if (col.is_nullable === 'NO') def += ' NOT NULL';
                colDefs.push(def);
            }
            
            if (pkColumns.length > 0) {
                colDefs.push(`    PRIMARY KEY (${pkColumns.join(', ')})`);
            }
            
            createSql += colDefs.join(',\n');
            createSql += '\n);';
            sql.push(createSql);
            sql.push('');
            
            console.log(`   ✅ ${table}`);
        }

        // 3. Export data
        console.log('');
        console.log('📊 Exporting table data...');
        sql.push('-- ============================================');
        sql.push('-- PART 2: TABLE DATA');
        sql.push('-- ============================================');
        sql.push('');

        for (const table of sortedTables) {
            const countRes = await client.query(`SELECT COUNT(*) FROM ${table}`);
            const rowCount = parseInt(countRes.rows[0].count);
            
            if (rowCount === 0) {
                sql.push(`-- ${table}: 0 rows (empty)`);
                sql.push('');
                continue;
            }

            sql.push(`-- ${table}: ${rowCount} rows`);
            
            // Get data
            const dataRes = await client.query(`SELECT * FROM ${table}`);
            
            // Get column names
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
                    
                    sql.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
                }
            }
            
            sql.push('');
            console.log(`   ✅ ${table}: ${rowCount} rows`);
        }

        // 4. Export indexes
        console.log('');
        console.log('🔍 Exporting indexes...');
        sql.push('-- ============================================');
        sql.push('-- PART 3: INDEXES');
        sql.push('-- ============================================');
        sql.push('');

        const indexesRes = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname NOT LIKE '%_pkey'
            ORDER BY tablename, indexname
        `);

        for (const idx of indexesRes.rows) {
            sql.push(`${idx.indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS')};`);
        }
        sql.push('');

        // 5. Export functions
        console.log('');
        console.log('⚙️  Exporting functions...');
        sql.push('-- ============================================');
        sql.push('-- PART 4: FUNCTIONS');
        sql.push('-- ============================================');
        sql.push('');

        const funcRes = await client.query(`
            SELECT proname, pg_get_functiondef(oid) as funcdef
            FROM pg_proc
            WHERE pronamespace = 'public'::regnamespace
            AND prokind = 'f'
        `);

        for (const func of funcRes.rows) {
            sql.push(`-- Function: ${func.proname}`);
            sql.push(func.funcdef + ';');
            sql.push('');
        }

        // 6. Reset sequences
        console.log('');
        console.log('🔢 Setting up sequence resets...');
        sql.push('-- ============================================');
        sql.push('-- PART 5: SEQUENCE RESETS');
        sql.push('-- ============================================');
        sql.push('');

        for (const table of sortedTables) {
            const seqRes = await client.query(`
                SELECT column_name, column_default
                FROM information_schema.columns
                WHERE table_name = $1 AND column_default LIKE 'nextval%'
            `, [table]);

            for (const seq of seqRes.rows) {
                const maxRes = await client.query(`SELECT COALESCE(MAX(${seq.column_name}), 0) + 1 as next FROM ${table}`);
                const seqName = `${table}_${seq.column_name}_seq`;
                sql.push(`SELECT setval('${seqName}', ${maxRes.rows[0].next}, false);`);
            }
        }
        sql.push('');

        // Commit
        sql.push('COMMIT;');
        sql.push('');
        sql.push('-- ============================================');
        sql.push('-- MIGRATION COMPLETE');
        sql.push('-- ============================================');
        sql.push('');

        // Write file
        fs.writeFileSync(outputFile, sql.join('\n'), 'utf8');
        
        console.log('');
        console.log('='.repeat(60));
        console.log('✅ Export completed!');
        console.log('');
        console.log(`📄 Output: ${outputFile}`);
        console.log('');
        console.log('📌 Next steps for VPS migration:');
        console.log('   1. Copy to VPS: scp database-full-vps.sql root@76.13.17.87:/tmp/');
        console.log('   2. SSH to VPS: ssh root@76.13.17.87');
        console.log('   3. Create DB:  sudo -u postgres createdb asisya_db');
        console.log('   4. Import:     sudo -u postgres psql asisya_db < /tmp/database-full-vps.sql');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run
exportDatabase().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
