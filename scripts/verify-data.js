// Direct test script using database - verify all data is correct
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    console.log('🔍 COMPREHENSIVE DATA VERIFICATION\n');
    console.log('='.repeat(60));
    
    try {
        // 1. Check all exams
        console.log('\n📋 ALL EXAMS:');
        const examsRes = await client.query(`
            SELECT id, title, exam_type
            FROM exams
            ORDER BY id
        `);
        examsRes.rows.forEach(e => {
            console.log(`  ID ${e.id}: ${e.title} (type: ${e.exam_type || 'general'})`);
        });
        
        // 2. Check PSS attempts with their stored data
        console.log('\n🧠 PSS EXAM ATTEMPTS:');
        const pssRes = await client.query(`
            SELECT 
                ea.id as attempt_id,
                COALESCE(up.full_name, u.username) as student,
                ea.score,
                ea.pss_category,
                ea.pss_result IS NOT NULL as has_pss_result,
                ea.status
            FROM exam_attempts ea
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'pss'
            ORDER BY ea.end_time DESC
        `);
        if (pssRes.rows.length === 0) {
            console.log('  No PSS attempts found');
        } else {
            pssRes.rows.forEach(r => {
                console.log(`  ${r.student}: score=${r.score}, category="${r.pss_category || 'NULL'}", status=${r.status}, has_result=${r.has_pss_result}`);
            });
        }
        
        // 3. Check SRQ attempts with their stored data
        console.log('\n📊 SRQ-29 EXAM ATTEMPTS:');
        const srqRes = await client.query(`
            SELECT 
                ea.id as attempt_id,
                COALESCE(up.full_name, u.username) as student,
                ea.score,
                ea.srq_conclusion,
                ea.srq_result IS NOT NULL as has_srq_result,
                ea.status
            FROM exam_attempts ea
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29'
            ORDER BY ea.end_time DESC
        `);
        if (srqRes.rows.length === 0) {
            console.log('  No SRQ attempts found');
        } else {
            srqRes.rows.forEach(r => {
                console.log(`  ${r.student}: score=${r.score}, conclusion="${r.srq_conclusion || 'NULL'}", status=${r.status}, has_result=${r.has_srq_result}`);
            });
        }
        
        // 4. Check regular exam attempts
        console.log('\n📝 REGULAR EXAM ATTEMPTS (non-PSS/SRQ):');
        const regRes = await client.query(`
            SELECT 
                e.title,
                COUNT(ea.id) as total_attempts,
                COUNT(CASE WHEN ea.status = 'completed' THEN 1 END) as completed
            FROM exams e
            LEFT JOIN exam_attempts ea ON e.id = ea.exam_id
            WHERE e.exam_type NOT IN ('pss', 'srq29') OR e.exam_type IS NULL
            GROUP BY e.id, e.title
            ORDER BY e.id
        `);
        regRes.rows.forEach(r => {
            console.log(`  ${r.title}: ${r.completed}/${r.total_attempts} completed`);
        });
        
        // 5. Check candidate_groups (for filter functionality)
        console.log('\n👥 CANDIDATE GROUPS (Psychologist Assignments):');
        const groupsRes = await client.query(`
            SELECT 
                e.title as exam_title,
                COALESCE(u.full_name, u.username) as assessor,
                COUNT(cg.candidate_id) as assigned_count
            FROM candidate_groups cg
            JOIN exams e ON cg.exam_id = e.id
            JOIN users u ON cg.assessor_id = u.id
            GROUP BY e.title, u.full_name, u.username
            ORDER BY e.title, assessor
        `);
        if (groupsRes.rows.length === 0) {
            console.log('  No candidate groups found (filter "Semua" will be default)');
        } else {
            groupsRes.rows.forEach(r => {
                console.log(`  ${r.exam_title}: ${r.assessor} has ${r.assigned_count} candidates`);
            });
        }
        
        // 6. Summary statistics
        console.log('\n📈 SUMMARY:');
        const statsRes = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM exams) as active_exams,
                (SELECT COUNT(*) FROM exam_attempts WHERE status = 'completed') as total_completed,
                (SELECT COUNT(*) FROM users WHERE role = 'candidate') as total_candidates,
                (SELECT COUNT(*) FROM users WHERE role = 'psychologist') as active_psychologists
        `);
        const stats = statsRes.rows[0];
        console.log(`  Active Exams: ${stats.active_exams}`);
        console.log(`  Total Completed Attempts: ${stats.total_completed}`);
        console.log(`  Total Candidates: ${stats.total_candidates}`);
        console.log(`  Active Psychologists: ${stats.active_psychologists}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Verification complete\n');
        
        // 7. Check for potential issues
        console.log('⚠️  POTENTIAL ISSUES:');
        
        // Check for NULL pss_category in PSS exams
        const nullPss = await client.query(`
            SELECT COUNT(*) as count FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'pss' AND ea.status = 'completed' AND ea.pss_category IS NULL
        `);
        if (parseInt(nullPss.rows[0].count) > 0) {
            console.log(`  ❌ ${nullPss.rows[0].count} PSS attempts with NULL pss_category`);
        } else {
            console.log(`  ✓ All PSS attempts have pss_category`);
        }
        
        // Check for NULL srq_conclusion in SRQ exams
        const nullSrq = await client.query(`
            SELECT COUNT(*) as count FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' AND ea.status = 'completed' AND ea.srq_conclusion IS NULL
        `);
        if (parseInt(nullSrq.rows[0].count) > 0) {
            console.log(`  ❌ ${nullSrq.rows[0].count} SRQ attempts with NULL srq_conclusion`);
        } else {
            console.log(`  ✓ All SRQ attempts have srq_conclusion`);
        }
        
        // Check for incomplete srq_conclusion (e.g., "Tidak Normal - ")
        const incompleteSrq = await client.query(`
            SELECT COUNT(*) as count FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' AND ea.status = 'completed' 
            AND ea.srq_conclusion LIKE 'Tidak Normal - ' 
            AND LENGTH(ea.srq_conclusion) < 20
        `);
        if (parseInt(incompleteSrq.rows[0].count) > 0) {
            console.log(`  ❌ ${incompleteSrq.rows[0].count} SRQ attempts with incomplete srq_conclusion`);
        } else {
            console.log(`  ✓ All SRQ conclusions are complete`);
        }
        
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
