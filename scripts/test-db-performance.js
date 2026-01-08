// Test database performance untuk diagnose masalah 81s load time
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Abyansyah123@localhost:5432/asisya_web',
    max: 100,
    min: 20,
});

async function testQueries() {
    console.log('🔍 Testing Database Performance...\n');

    try {
        // 1. Test simple query
        console.log('1️⃣ Testing simple query (site_settings)...');
        const start1 = Date.now();
        const result1 = await pool.query('SELECT * FROM site_settings');
        console.log(`   ✅ ${Date.now() - start1}ms (${result1.rows.length} rows)\n`);

        // 2. Check table sizes
        console.log('2️⃣ Checking table sizes...');
        const tables = ['users', 'exams', 'exam_attempts'];
        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   📊 ${table}: ${result.rows[0].count} rows`);
        }
        console.log('');

        // 3. Test dashboard queries (yang paling lambat)
        console.log('3️⃣ Testing dashboard queries...');
        
        // Get first user
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            console.log('   ⚠️ No users found');
            return;
        }
        const userId = userResult.rows[0].id;

        // Test each dashboard query separately
        console.log(`   Testing for user_id: ${userId}`);

        const start2 = Date.now();
        await pool.query('SELECT id, username, email, full_name FROM users WHERE id = $1', [userId]);
        console.log(`   ✅ User info: ${Date.now() - start2}ms`);

        const start3 = Date.now();
        await pool.query(`
            SELECT ea.id as attempt_id, ea.exam_id, e.title
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE ea.user_id = $1 AND ea.status = 'in_progress'
            LIMIT 1
        `, [userId]);
        console.log(`   ✅ In progress: ${Date.now() - start3}ms`);

        const start4 = Date.now();
        await pool.query(`
            SELECT ea.id as attempt_id, e.title, ea.end_time as date, ea.score, ea.status
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE ea.user_id = $1 AND ea.status = 'completed'
            ORDER BY ea.end_time DESC
            LIMIT 50
        `, [userId]);
        console.log(`   ✅ Completed: ${Date.now() - start4}ms`);

        const start5 = Date.now();
        await pool.query(`
            SELECT e.id, e.title, e.duration_minutes, e.created_at, e.description, e.instructions
            FROM exams e
            WHERE e.status = 'published'
            AND NOT EXISTS (
                SELECT 1 FROM exam_attempts ea
                WHERE ea.user_id = $1 AND ea.exam_id = e.id AND ea.status = 'completed'
            )
            ORDER BY e.created_at DESC
        `, [userId]);
        console.log(`   ✅ Available exams: ${Date.now() - start5}ms\n`);

        // 4. Test concurrent load
        console.log('4️⃣ Testing 10 concurrent requests...');
        const start6 = Date.now();
        await Promise.all(Array(10).fill(0).map(() => 
            pool.query('SELECT setting_key, setting_value FROM site_settings')
        ));
        console.log(`   ✅ ${Date.now() - start6}ms for 10 requests\n`);

        // 5. Check indexes
        console.log('5️⃣ Checking indexes...');
        const indexes = await pool.query(`
            SELECT tablename, indexname, indexdef 
            FROM pg_indexes 
            WHERE schemaname = 'public'
            AND tablename IN ('users', 'exams', 'exam_attempts', 'site_settings')
            ORDER BY tablename, indexname
        `);
        indexes.rows.forEach(idx => {
            console.log(`   📑 ${idx.tablename}.${idx.indexname}`);
        });

        console.log('\n✅ Performance test completed!');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

testQueries();
