/**
 * Comprehensive Exam Business Flow Checker
 * Verifies: Popups, Answer Storage, Results Display, APIs
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
console.log('Database URL:', dbUrl ? `Found (${dbUrl.substring(0, 30)}...)` : 'NOT FOUND!');

const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function checkExamFlow() {
    const client = await pool.connect();
    
    try {
        console.log('=' .repeat(70));
        console.log('📋 COMPREHENSIVE EXAM BUSINESS FLOW CHECK');
        console.log('=' .repeat(70));
        
        // 1. Check all exam types
        console.log('\n\n📚 1. EXAM TYPES IN DATABASE');
        console.log('-'.repeat(50));
        
        const exams = await client.query(`
            SELECT id, title, exam_type, status, 
                   (SELECT COUNT(*) FROM questions WHERE exam_id = exams.id) as question_count,
                   require_all_answers, display_mode
            FROM exams 
            ORDER BY id
        `);
        
        console.log('ID | Type      | Status    | Questions | Title');
        console.log('-'.repeat(70));
        exams.rows.forEach(e => {
            console.log(
                `${e.id.toString().padStart(2)} | ${(e.exam_type || 'general').padEnd(9)} | ${(e.status || 'unknown').padEnd(9)} | ${e.question_count.toString().padStart(9)} | ${e.title.substring(0, 30)}`
            );
        });
        
        // 2. Check exam_answers table structure
        console.log('\n\n📊 2. EXAM_ANSWERS TABLE CHECK');
        console.log('-'.repeat(50));
        
        const answerStats = await client.query(`
            SELECT 
                e.id as exam_id,
                e.title,
                e.exam_type,
                COUNT(DISTINCT eat.id) as attempts_with_answers,
                COUNT(ans.id) as total_answers
            FROM exams e
            LEFT JOIN exam_attempts eat ON eat.exam_id = e.id
            LEFT JOIN exam_answers ans ON ans.attempt_id = eat.id
            GROUP BY e.id, e.title, e.exam_type
            ORDER BY e.id
        `);
        
        console.log('ID | Type      | Attempts | Answers | Title');
        console.log('-'.repeat(70));
        answerStats.rows.forEach(s => {
            console.log(
                `${s.exam_id.toString().padStart(2)} | ${(s.exam_type || 'general').padEnd(9)} | ${s.attempts_with_answers.toString().padStart(8)} | ${s.total_answers.toString().padStart(7)} | ${s.title.substring(0, 30)}`
            );
        });
        
        // 3. Check PSS Results
        console.log('\n\n🧠 3. PSS EXAM RESULTS');
        console.log('-'.repeat(50));
        
        const pssResults = await client.query(`
            SELECT ea.id, ea.user_id, ea.score, ea.pss_category, ea.pss_result,
                   u.full_name as name,
                   (SELECT COUNT(*) FROM exam_answers WHERE attempt_id = ea.id) as answer_count
            FROM exam_attempts ea
            JOIN users u ON u.id = ea.user_id
            JOIN exams e ON e.id = ea.exam_id
            WHERE e.exam_type = 'pss'
            ORDER BY ea.id DESC
            LIMIT 5
        `);
        
        if (pssResults.rows.length === 0) {
            console.log('❌ No PSS attempts found');
        } else {
            console.log(`Found ${pssResults.rows.length} PSS attempts:`);
            pssResults.rows.forEach(r => {
                console.log(`\n  Attempt #${r.id} by ${r.name}`);
                console.log(`  Score: ${r.score}, Category: ${r.pss_category}`);
                console.log(`  Answers saved: ${r.answer_count}`);
                if (r.pss_result) {
                    try {
                        const parsed = JSON.parse(r.pss_result);
                        console.log(`  PSS Result: level=${parsed.level}, label="${parsed.levelLabel}"`);
                    } catch (e) {
                        console.log(`  PSS Result: ${r.pss_result.substring(0, 50)}...`);
                    }
                }
            });
        }
        
        // 4. Check SRQ Results
        console.log('\n\n🧠 4. SRQ-29 EXAM RESULTS');
        console.log('-'.repeat(50));
        
        const srqResults = await client.query(`
            SELECT ea.id, ea.user_id, ea.score, ea.srq_conclusion, ea.srq_result,
                   u.full_name as name,
                   (SELECT COUNT(*) FROM exam_answers WHERE attempt_id = ea.id) as answer_count
            FROM exam_attempts ea
            JOIN users u ON u.id = ea.user_id
            JOIN exams e ON e.id = ea.exam_id
            WHERE e.exam_type = 'srq29'
            ORDER BY ea.id DESC
            LIMIT 5
        `);
        
        if (srqResults.rows.length === 0) {
            console.log('❌ No SRQ-29 attempts found');
        } else {
            console.log(`Found ${srqResults.rows.length} SRQ-29 attempts:`);
            srqResults.rows.forEach(r => {
                console.log(`\n  Attempt #${r.id} by ${r.name}`);
                console.log(`  Score: ${r.score}, Conclusion: ${r.srq_conclusion}`);
                console.log(`  Answers saved: ${r.answer_count}`);
                if (r.srq_result) {
                    try {
                        const parsed = JSON.parse(r.srq_result);
                        console.log(`  Result structure: anxiety=${parsed.result?.anxiety}, substance=${parsed.result?.substance}, psychotic=${parsed.result?.psychotic}, ptsd=${parsed.result?.ptsd}`);
                        console.log(`  Output text: ${(parsed.result?.resultText || '').substring(0, 60)}...`);
                    } catch (e) {
                        console.log(`  SRQ Result: ${r.srq_result.substring(0, 50)}...`);
                    }
                }
            });
        }
        
        // 5. Check MMPI (General) Results
        console.log('\n\n🧠 5. MMPI/GENERAL EXAM RESULTS');
        console.log('-'.repeat(50));
        
        const mmpiResults = await client.query(`
            SELECT ea.id, ea.user_id, ea.score, ea.status, e.title, e.exam_type,
                   u.full_name as name,
                   (SELECT COUNT(*) FROM exam_answers WHERE attempt_id = ea.id) as answer_count,
                   (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as total_questions
            FROM exam_attempts ea
            JOIN users u ON u.id = ea.user_id
            JOIN exams e ON e.id = ea.exam_id
            WHERE e.exam_type = 'general' OR e.exam_type IS NULL
            ORDER BY ea.id DESC
            LIMIT 10
        `);
        
        if (mmpiResults.rows.length === 0) {
            console.log('❌ No MMPI/General attempts found');
        } else {
            console.log(`Found ${mmpiResults.rows.length} MMPI/General attempts:`);
            mmpiResults.rows.forEach(r => {
                const hasAnswers = r.answer_count > 0;
                console.log(`\n  Attempt #${r.id} by ${r.name} - ${r.title}`);
                console.log(`  Status: ${r.status}, Score: ${r.score}`);
                console.log(`  Answers: ${r.answer_count}/${r.total_questions} ${hasAnswers ? '✅' : '❌ NO ANSWERS'}`);
            });
        }
        
        // 6. Check sample exam_answers data
        console.log('\n\n📝 6. SAMPLE EXAM_ANSWERS DATA');
        console.log('-'.repeat(50));
        
        const sampleAnswers = await client.query(`
            SELECT 
                ans.id, ans.attempt_id, ans.question_id, ans.selected_option_id,
                ans.answered_at,
                q.text as question_text,
                o.text as selected_option_text,
                e.exam_type
            FROM exam_answers ans
            JOIN questions q ON q.id = ans.question_id
            JOIN options o ON o.id = ans.selected_option_id
            JOIN exam_attempts ea ON ea.id = ans.attempt_id
            JOIN exams e ON e.id = ea.exam_id
            ORDER BY ans.id DESC
            LIMIT 10
        `);
        
        if (sampleAnswers.rows.length === 0) {
            console.log('❌ No answers in exam_answers table!');
        } else {
            console.log('Recent answers:');
            sampleAnswers.rows.forEach(a => {
                console.log(`\n  ID: ${a.id} | Attempt: ${a.attempt_id} | Type: ${a.exam_type || 'general'}`);
                console.log(`  Q: ${a.question_text.substring(0, 50)}...`);
                console.log(`  A: ${a.selected_option_text}`);
            });
        }
        
        // 7. Verify popup/instructions content in exams
        console.log('\n\n📋 7. EXAM INSTRUCTIONS (Popup Content)');
        console.log('-'.repeat(50));
        
        const examInstructions = await client.query(`
            SELECT id, title, exam_type, instructions, description
            FROM exams
            WHERE exam_type IN ('pss', 'srq29') OR title ILIKE '%MMPI%'
            ORDER BY id
        `);
        
        examInstructions.rows.forEach(e => {
            console.log(`\n[${e.id}] ${e.title} (${e.exam_type || 'general'})`);
            console.log(`  Instructions: ${e.instructions ? '✅ Yes (' + e.instructions.length + ' chars)' : '❌ NONE'}`);
            console.log(`  Description: ${e.description ? '✅ Yes (' + e.description.length + ' chars)' : '❌ NONE'}`);
            if (e.instructions) {
                console.log(`  Preview: ${e.instructions.substring(0, 100)}...`);
            }
        });
        
        // 8. Summary
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 SUMMARY');
        console.log('='.repeat(70));
        
        const summary = await client.query(`
            SELECT 
                e.exam_type,
                COUNT(DISTINCT ea.id) as total_attempts,
                COUNT(DISTINCT CASE WHEN ea.status = 'completed' THEN ea.id END) as completed,
                SUM(CASE WHEN ea.status = 'completed' THEN (SELECT COUNT(*) FROM exam_answers WHERE attempt_id = ea.id) ELSE 0 END) as total_answers
            FROM exams e
            LEFT JOIN exam_attempts ea ON ea.exam_id = e.id
            GROUP BY e.exam_type
        `);
        
        console.log('\nBy Exam Type:');
        summary.rows.forEach(s => {
            console.log(`  ${(s.exam_type || 'general').padEnd(10)}: ${s.total_attempts} attempts, ${s.completed} completed, ${s.total_answers} answers saved`);
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkExamFlow().catch(console.error);
