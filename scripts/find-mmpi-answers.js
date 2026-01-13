#!/usr/bin/env node
/**
 * Find MMPI answers - comprehensive search
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
        console.log('🔍 COMPREHENSIVE SEARCH FOR MMPI/TES1 ANSWERS\n');
        console.log('='.repeat(60) + '\n');

        // 1. Check TES 1 exam details (183 questions = MMPI)
        console.log('1️⃣ TES 1 Exam (MMPI) Details:');
        const exam = await client.query(`SELECT * FROM exams WHERE id = 5`);
        console.log('  Exam:', JSON.stringify(exam.rows[0], null, 2));

        // 2. Check TES 1 attempts
        console.log('\n2️⃣ TES 1 Attempts with scores:');
        const attempts = await client.query(`
            SELECT ea.id, ea.user_id, u.username, ea.score, ea.status, ea.end_time
            FROM exam_attempts ea
            JOIN users u ON ea.user_id = u.id
            WHERE ea.exam_id = 5
            ORDER BY ea.id
        `);
        for (const row of attempts.rows) {
            console.log(`  #${row.id}: ${row.username} - Score: ${row.score}, Status: ${row.status}`);
        }

        // 3. Check exam_answers for TES 1
        console.log('\n3️⃣ exam_answers for TES 1:');
        const examAnswers = await client.query(`
            SELECT ea.id as attempt_id, COUNT(ans.id) as answer_count
            FROM exam_attempts ea
            LEFT JOIN exam_answers ans ON ea.id = ans.attempt_id
            WHERE ea.exam_id = 5
            GROUP BY ea.id
            ORDER BY ea.id
        `);
        for (const row of examAnswers.rows) {
            console.log(`  Attempt #${row.attempt_id}: ${row.answer_count} answers`);
        }

        // 4. Check old answers table for TES 1
        console.log('\n4️⃣ OLD answers table for TES 1:');
        const oldAnswers = await client.query(`
            SELECT ea.id as attempt_id, COUNT(ans.id) as answer_count
            FROM exam_attempts ea
            LEFT JOIN answers ans ON ea.id = ans.attempt_id
            WHERE ea.exam_id = 5
            GROUP BY ea.id
            ORDER BY ea.id
        `);
        for (const row of oldAnswers.rows) {
            if (row.answer_count > 0) {
                console.log(`  Attempt #${row.attempt_id}: ${row.answer_count} answers ✅`);
            }
        }
        
        // 5. Check if there's any JSON storage
        console.log('\n5️⃣ Check for JSON answer storage in any table:');
        const jsonCols = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (column_name LIKE '%answer%' OR column_name LIKE '%response%' OR data_type = 'jsonb')
        `);
        console.log('  JSON/Answer columns:', jsonCols.rows.map(r => `${r.table_name}.${r.column_name}`).join(', '));

        // 6. Sample a TES 1 attempt that HAS answers
        console.log('\n6️⃣ Sample TES 1 attempt WITH answers:');
        const withAnswers = await client.query(`
            SELECT ea.id, ea.user_id, ea.score, COUNT(ans.id) as cnt
            FROM exam_attempts ea
            JOIN exam_answers ans ON ea.id = ans.attempt_id
            WHERE ea.exam_id = 5
            GROUP BY ea.id, ea.user_id, ea.score
            HAVING COUNT(ans.id) > 0
            LIMIT 1
        `);
        if (withAnswers.rows.length > 0) {
            const attemptId = withAnswers.rows[0].id;
            console.log(`  Found attempt #${attemptId} with ${withAnswers.rows[0].cnt} answers`);
            
            // Get sample answers
            const sampleAns = await client.query(`
                SELECT ans.*, q.text as question_text, o.text as option_text, o.is_correct
                FROM exam_answers ans
                JOIN questions q ON ans.question_id = q.id
                JOIN options o ON ans.selected_option_id = o.id
                WHERE ans.attempt_id = $1
                LIMIT 5
            `, [attemptId]);
            console.log('  Sample answers:');
            for (const a of sampleAns.rows) {
                console.log(`    Q: "${a.question_text.substring(0, 40)}..." -> "${a.option_text}" (correct: ${a.is_correct})`);
            }
        } else {
            console.log('  No TES 1 attempts have answers in exam_answers');
        }

        // 7. Check questions structure for TES 1
        console.log('\n7️⃣ TES 1 Questions sample:');
        const questions = await client.query(`
            SELECT q.id, q.text, q.marks,
                   array_agg(o.text ORDER BY o.id) as options,
                   array_agg(o.is_correct ORDER BY o.id) as correct_flags
            FROM questions q
            JOIN options o ON q.id = o.question_id
            WHERE q.exam_id = 5
            GROUP BY q.id, q.text, q.marks
            ORDER BY q.id
            LIMIT 3
        `);
        for (const q of questions.rows) {
            console.log(`  Q${q.id}: "${q.text.substring(0, 50)}..."`);
            console.log(`    Options: ${q.options.join(' | ')}`);
            console.log(`    Correct: ${q.correct_flags.join(' | ')}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        pool.end();
    }
}

check();
