const { Pool } = require('pg');

// Database connection
const DATABASE_URL = 'postgresql://neondb_owner:npg_iNjfX2mduDK1@ep-plain-dew-a1dxkrai-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: true });

const BASE_URL = 'https://asisya-web-pipe.vercel.app';

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
    try {
        const url = `${BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        return { status: response.status, ok: response.ok, data: await response.json().catch(() => null) };
    } catch (err) {
        return { status: 0, ok: false, error: err.message };
    }
}

async function runAudit() {
    const client = await pool.connect();
    const issues = [];
    const warnings = [];
    const passed = [];

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          ASISYA COMPREHENSIVE SYSTEM AUDIT                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // ==================== 1. DATABASE INTEGRITY ====================
        console.log('🔍 1. DATABASE INTEGRITY CHECKS\n');

        // Check users table
        const users = await client.query('SELECT COUNT(*) as total, role FROM users GROUP BY role ORDER BY role');
        console.log('  Users by role:');
        users.rows.forEach(r => console.log(`    - ${r.role}: ${r.total}`));
        passed.push('Users table OK');

        // Check for orphan records
        const orphanProfiles = await client.query(`
            SELECT COUNT(*) as count FROM user_profiles up 
            WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = up.user_id)
        `);
        if (parseInt(orphanProfiles.rows[0].count) > 0) {
            issues.push(`Found ${orphanProfiles.rows[0].count} orphan user_profiles`);
        } else {
            passed.push('No orphan user_profiles');
        }

        // Check exams
        const exams = await client.query(`
            SELECT e.id, e.title, e.exam_type, e.status,
                   (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as question_count
            FROM exams e ORDER BY e.id
        `);
        console.log('\n  Exams:');
        exams.rows.forEach(e => {
            const status = e.status === 'active' ? '✅' : '⏸️';
            console.log(`    ${status} [${e.id}] ${e.title} (${e.exam_type || 'general'}): ${e.question_count} questions`);
        });

        // Validate PSS/SRQ question counts
        const pss = exams.rows.find(e => e.exam_type === 'pss');
        const srq = exams.rows.find(e => e.exam_type === 'srq29');
        
        if (pss && parseInt(pss.question_count) !== 10) {
            issues.push(`PSS should have 10 questions, has ${pss.question_count}`);
        } else if (pss) {
            passed.push('PSS has correct 10 questions');
        }
        
        if (srq && parseInt(srq.question_count) !== 29) {
            issues.push(`SRQ should have 29 questions, has ${srq.question_count}`);
        } else if (srq) {
            passed.push('SRQ has correct 29 questions');
        }

        // Check for duplicate exams
        const duplicateExams = await client.query(`
            SELECT exam_type, COUNT(*) as count FROM exams 
            WHERE exam_type IN ('pss', 'srq29') 
            GROUP BY exam_type HAVING COUNT(*) > 1
        `);
        if (duplicateExams.rows.length > 0) {
            duplicateExams.rows.forEach(d => {
                issues.push(`Duplicate ${d.exam_type} exams found: ${d.count}`);
            });
        } else {
            passed.push('No duplicate PSS/SRQ exams');
        }

        // Check options have is_correct for each question
        const questionsWithoutCorrect = await client.query(`
            SELECT q.id, q.exam_id FROM questions q
            WHERE NOT EXISTS (
                SELECT 1 FROM options o WHERE o.question_id = q.id AND o.is_correct = TRUE
            )
        `);
        if (questionsWithoutCorrect.rows.length > 0) {
            warnings.push(`${questionsWithoutCorrect.rows.length} questions have no correct answer marked`);
        } else {
            passed.push('All questions have correct answer marked');
        }

        // Check exam_attempts
        const attempts = await client.query(`
            SELECT status, COUNT(*) as count FROM exam_attempts GROUP BY status
        `);
        console.log('\n  Exam Attempts by status:');
        attempts.rows.forEach(a => console.log(`    - ${a.status}: ${a.count}`));

        // Check for stuck in_progress attempts (older than 24 hours)
        const stuckAttempts = await client.query(`
            SELECT COUNT(*) as count FROM exam_attempts 
            WHERE status = 'in_progress' 
            AND start_time < NOW() - INTERVAL '24 hours'
        `);
        if (parseInt(stuckAttempts.rows[0].count) > 0) {
            warnings.push(`${stuckAttempts.rows[0].count} exam attempts stuck in progress > 24 hours`);
        }

        // Check codes
        const codes = await client.query(`
            SELECT 
                CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status, 
                COUNT(*) as count 
            FROM candidate_codes GROUP BY is_active
        `);
        console.log('\n  Registration Codes by status:');
        codes.rows.forEach(c => console.log(`    - ${c.status}: ${c.count}`));

        // ==================== 2. API ENDPOINT TESTS ====================
        console.log('\n🔍 2. API ENDPOINT TESTS\n');

        // Health check
        const health = await apiCall('/api/health');
        if (health.ok) {
            passed.push('Health endpoint OK');
            console.log('  ✅ /api/health - OK');
        } else {
            issues.push('Health endpoint failing');
            console.log('  ❌ /api/health - FAILED');
        }

        // Public endpoints
        const publicEndpoints = [
            '/api/settings/logo',
            '/api/auth/logout',
        ];

        for (const endpoint of publicEndpoints) {
            const res = await apiCall(endpoint);
            if (res.status !== 500) {
                console.log(`  ✅ ${endpoint} - ${res.status}`);
            } else {
                issues.push(`${endpoint} returning 500`);
                console.log(`  ❌ ${endpoint} - 500 Server Error`);
            }
        }

        // Protected endpoints (should return 401 without auth)
        const protectedEndpoints = [
            '/api/admin/exams',
            '/api/admin/codes',
            '/api/candidate/dashboard',
            '/api/psychologist/candidates',
            '/api/superadmin/users',
        ];

        console.log('\n  Protected endpoints (expecting 401/403):');
        for (const endpoint of protectedEndpoints) {
            const res = await apiCall(endpoint);
            if (res.status === 401 || res.status === 403) {
                console.log(`  ✅ ${endpoint} - Protected (${res.status})`);
            } else if (res.status === 500) {
                issues.push(`${endpoint} returning 500 instead of 401`);
                console.log(`  ❌ ${endpoint} - 500 Server Error`);
            } else {
                warnings.push(`${endpoint} not properly protected (${res.status})`);
                console.log(`  ⚠️ ${endpoint} - ${res.status}`);
            }
        }

        // ==================== 3. DATA CONSISTENCY ====================
        console.log('\n🔍 3. DATA CONSISTENCY CHECKS\n');

        // Check PSS/SRQ results
        const pssResults = await client.query(`
            SELECT COUNT(*) as total,
                   COUNT(pss_category) as with_category,
                   COUNT(pss_result) as with_result
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'pss' AND ea.status = 'completed'
        `);
        console.log(`  PSS Results: ${pssResults.rows[0].total} total, ${pssResults.rows[0].with_category} with category`);
        
        const srqResults = await client.query(`
            SELECT COUNT(*) as total,
                   COUNT(srq_conclusion) as with_conclusion,
                   COUNT(srq_result) as with_result
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' AND ea.status = 'completed'
        `);
        console.log(`  SRQ Results: ${srqResults.rows[0].total} total, ${srqResults.rows[0].with_conclusion} with conclusion`);

        // Check answers in both tables
        const examAnswersCount = await client.query('SELECT COUNT(*) as count FROM exam_answers');
        const answersCount = await client.query('SELECT COUNT(*) as count FROM answers');
        console.log(`\n  Answers tables:`);
        console.log(`    - exam_answers: ${examAnswersCount.rows[0].count} records`);
        console.log(`    - answers (legacy): ${answersCount.rows[0].count} records`);

        // Check candidate_groups (psychologist assignments)
        const assignments = await client.query(`
            SELECT COUNT(DISTINCT assessor_id) as psychologists,
                   COUNT(DISTINCT candidate_id) as candidates,
                   COUNT(*) as total_assignments
            FROM candidate_groups
        `);
        console.log(`\n  Psychologist Assignments:`);
        console.log(`    - ${assignments.rows[0].psychologists} psychologists`);
        console.log(`    - ${assignments.rows[0].candidates} candidates assigned`);
        console.log(`    - ${assignments.rows[0].total_assignments} total assignments`);

        // ==================== 4. SECURITY CHECKS ====================
        console.log('\n🔍 4. SECURITY CHECKS\n');

        // Check for users without proper role
        const invalidRoles = await client.query(`
            SELECT COUNT(*) as count FROM users 
            WHERE role NOT IN ('candidate', 'psychologist', 'admin', 'super_admin')
        `);
        if (parseInt(invalidRoles.rows[0].count) > 0) {
            issues.push(`${invalidRoles.rows[0].count} users with invalid roles`);
        } else {
            passed.push('All users have valid roles');
            console.log('  ✅ All users have valid roles');
        }

        // Check for duplicate emails
        const duplicateEmails = await client.query(`
            SELECT email, COUNT(*) as count FROM users 
            GROUP BY email HAVING COUNT(*) > 1
        `);
        if (duplicateEmails.rows.length > 0) {
            issues.push(`${duplicateEmails.rows.length} duplicate emails found`);
            console.log(`  ❌ ${duplicateEmails.rows.length} duplicate emails`);
        } else {
            passed.push('No duplicate emails');
            console.log('  ✅ No duplicate emails');
        }

        // Check super_admin count
        const superAdmins = await client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'`);
        console.log(`  ℹ️  Super admins: ${superAdmins.rows[0].count}`);

        // ==================== SUMMARY ====================
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                      AUDIT SUMMARY                         ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log(`✅ PASSED: ${passed.length}`);
        passed.forEach(p => console.log(`   - ${p}`));

        if (warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
            warnings.forEach(w => console.log(`   - ${w}`));
        }

        if (issues.length > 0) {
            console.log(`\n❌ ISSUES: ${issues.length}`);
            issues.forEach(i => console.log(`   - ${i}`));
        } else {
            console.log('\n🎉 NO CRITICAL ISSUES FOUND!');
        }

        console.log('\n');

    } catch (err) {
        console.error('Audit error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runAudit();
