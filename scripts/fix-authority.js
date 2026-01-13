/**
 * Fix Authority Degradation Script
 * ================================
 * Jalankan script ini setiap kali ada masalah authority/role yang tidak sesuai.
 * 
 * Usage: node scripts/fix-authority.js
 * 
 * Users yang di-fix:
 * - ID 1 (admin) → role: admin
 * - ID 9 (dev.asisya.adm) → role: superadmin
 * - ID 13 (Psikolog) → role: psychologist (dengan password admin123)
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false
});

// Users yang harus diperbaiki role-nya
const AUTHORITY_CONFIG = [
    { id: 1, username: 'admin', role: 'admin', name: 'Administrator' },
    { id: 9, username: 'dev.asisya.adm', role: 'super_admin', name: 'Super Admin' },
    { id: 13, username: 'Psikolog', role: 'psychologist', name: 'Psikolog', resetPassword: true },
];

const DEFAULT_PASSWORD = 'admin123';

async function fixAuthority() {
    console.log('🔧 Fix Authority Degradation Script');
    console.log('='.repeat(60));
    console.log('');

    const client = await pool.connect();
    
    try {
        // Show current state
        console.log('📋 Current User Roles:');
        const currentRes = await client.query(
            'SELECT id, username, role, full_name FROM users WHERE id = ANY($1) ORDER BY id',
            [AUTHORITY_CONFIG.map(u => u.id)]
        );
        
        currentRes.rows.forEach(u => {
            const expected = AUTHORITY_CONFIG.find(c => c.id === u.id);
            const status = u.role === expected?.role ? '✅' : '❌';
            console.log(`  ${status} ID ${u.id}: ${u.username} → role: ${u.role} (expected: ${expected?.role})`);
        });
        
        console.log('');
        console.log('🔄 Fixing roles...');
        console.log('');

        // Hash password for users that need reset
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        for (const user of AUTHORITY_CONFIG) {
            let query, params;
            
            if (user.resetPassword) {
                // Reset password juga
                query = `
                    UPDATE users 
                    SET role = $1, password_hash = $2, full_name = COALESCE(full_name, $3)
                    WHERE id = $4
                    RETURNING id, username, role
                `;
                params = [user.role, hashedPassword, user.name, user.id];
            } else {
                // Update role saja
                query = `
                    UPDATE users 
                    SET role = $1, full_name = COALESCE(full_name, $2)
                    WHERE id = $3
                    RETURNING id, username, role
                `;
                params = [user.role, user.name, user.id];
            }
            
            const result = await client.query(query, params);
            
            if (result.rows.length > 0) {
                const u = result.rows[0];
                const pwdInfo = user.resetPassword ? ` (password: ${DEFAULT_PASSWORD})` : '';
                console.log(`  ✅ Fixed ID ${u.id}: ${u.username} → ${u.role}${pwdInfo}`);
            } else {
                console.log(`  ⚠️ User ID ${user.id} not found, creating...`);
                
                // Create user if not exists
                const insertQuery = `
                    INSERT INTO users (id, username, password_hash, role, full_name, email)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO UPDATE SET role = $4, password_hash = $3
                    RETURNING id, username, role
                `;
                const insertParams = [
                    user.id, 
                    user.username, 
                    hashedPassword, 
                    user.role, 
                    user.name,
                    `${user.username}@asisya.local`
                ];
                
                const insertResult = await client.query(insertQuery, insertParams);
                if (insertResult.rows.length > 0) {
                    console.log(`  ✅ Created ID ${user.id}: ${user.username} → ${user.role}`);
                }
            }
        }

        console.log('');
        console.log('📋 Verified User Roles:');
        const verifyRes = await client.query(
            'SELECT id, username, role, full_name FROM users WHERE id = ANY($1) ORDER BY id',
            [AUTHORITY_CONFIG.map(u => u.id)]
        );
        
        verifyRes.rows.forEach(u => {
            const expected = AUTHORITY_CONFIG.find(c => c.id === u.id);
            const status = u.role === expected?.role ? '✅' : '❌';
            console.log(`  ${status} ID ${u.id}: ${u.username} → ${u.role}`);
        });

        console.log('');
        console.log('='.repeat(60));
        console.log('✅ Authority fix completed!');
        console.log('');
        console.log('📌 Login credentials:');
        console.log('   • Admin (ID 1): username=admin');
        console.log('   • Superadmin (ID 9): username=dev.asisya.adm');
        console.log('   • Psikolog (ID 13): username=Psikolog, password=admin123');
        console.log('');
        console.log('📌 Valid roles: candidate, psychologist, admin, super_admin');
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
fixAuthority().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
