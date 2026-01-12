#!/usr/bin/env node
/**
 * Deep check for MMPI data - check all possible tables
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
        console.log('🔍 DEEP CHECK FOR MMPI DATA\n');
        console.log('='.repeat(60) + '\n');

        // 1. List all tables
        console.log('1️⃣ All Tables in Database:');
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('  Tables:', tables.rows.map(r => r.table_name).join(', '));

        // 2. Check if there's an 'answers' table and what's in it
        console.log('\n2️⃣ Check "answers" table:');
        try {
            const answersCount = await client.query('SELECT COUNT(*) as cnt FROM answers');
            console.log(`  Total rows in answers: ${answersCount.rows[0].cnt}`);
            
            const answersSample = await client.query(`
                SELECT a.*, ea.exam_id, e.title as exam_title, e.exam_type
                FROM answers a
                LEFT JOIN exam_attempts ea ON a.attempt_id = ea.id
                LEFT JOIN exams e ON ea.exam_id = e.id
                LIMIT 10
            `);
            if (answersSample.rows.length > 0) {
                console.log('  Sample answers:', JSON.stringify(answersSample.rows.slice(0, 3), null, 2));
            } else {
                console.log('  No data in answers table');
            }
        } catch (e) {
            console.log('  Table does not exist or error:', e.message);
        }

        // 3. Check exam_answers table
        console.log('\n3️⃣ Check "exam_answers" table:');
        try {
            const examAnswersCount = await client.query('SELECT COUNT(*) as cnt FROM exam_answers');
            console.log(`  Total rows in exam_answers: ${examAnswersCount.rows[0].cnt}`);
            
            // Group by exam
            const byExam = await client.query(`
                SELECT e.id, e.title, e.exam_type, COUNT(ans.id) as answer_count
                FROM exams e
                LEFT JOIN exam_attempts ea ON e.id = ea.exam_id
                LEFT JOIN exam_answers ans ON ea.id = ans.attempt_id
                GROUP BY e.id, e.title, e.exam_type
                ORDER BY e.id
            `);
            console.log('  Answers by exam:');
            for (const row of byExam.rows) {
                console.log(`    ${row.title} (${row.exam_type}): ${row.answer_count} answers`);
            }
        } catch (e) {
            console.log('  Table does not exist or error:', e.message);
        }

        // 4. Check for MMPI-like exams (might have different name)
        console.log('\n4️⃣ All Exams with question counts:');
        const exams = await client.query(`
            SELECT e.id, e.title, e.exam_type, 
                   COUNT(DISTINCT q.id) as question_count,
                   COUNT(DISTINCT ea.id) as attempt_count
            FROM exams e
            LEFT JOIN questions q ON e.id = q.exam_id
            LEFT JOIN exam_attempts ea ON e.id = ea.exam_id AND ea.status = 'completed'
            GROUP BY e.id, e.title, e.exam_type
            ORDER BY e.id
        `);
        for (const row of exams.rows) {
            const label = row.question_count > 100 ? '📋 LARGE EXAM (MMPI?)' : '';
            console.log(`  ID ${row.id}: ${row.title} (${row.exam_type}) - ${row.question_count} questions, ${row.attempt_count} attempts ${label}`);
        }

        // 5. Check specific attempts without answers
        console.log('\n5️⃣ Attempts WITHOUT answers in exam_answers:');
        const noAnswers = await client.query(`
            SELECT ea.id, ea.exam_id, e.title, ea.score, ea.status,
                   (SELECT COUNT(*) FROM exam_answers WHERE attempt_id = ea.id) as answer_count
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE ea.status = 'completed'
            AND (SELECT COUNT(*) FROM exam_answers WHERE attempt_id = ea.id) = 0
            ORDER BY ea.id
            LIMIT 20
        `);
        console.log(`  Found ${noAnswers.rows.length} attempts without answers:`);
        for (const row of noAnswers.rows) {
            console.log(`    Attempt #${row.id}: ${row.title} - Score: ${row.score}`);
        }

        // 6. Check if answers might be in a JSON column
        console.log('\n6️⃣ Check exam_attempts for JSON answer storage:');
        const attemptsColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'exam_attempts'
            ORDER BY ordinal_position
        `);
        console.log('  Columns in exam_attempts:', attemptsColumns.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));

        // 7. Sample an old attempt to see what data exists
        console.log('\n7️⃣ Sample old attempt data:');
        const oldAttempt = await client.query(`
            SELECT * FROM exam_attempts WHERE id = 1
        `);
        if (oldAttempt.rows.length > 0) {
            console.log('  Attempt #1:', JSON.stringify(oldAttempt.rows[0], null, 2));
        }

        // 8. Check if there's any backup or history tables
        console.log('\n8️⃣ Check for backup/history tables:');
        const backupTables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%backup%' OR table_name LIKE '%history%' OR table_name LIKE '%old%' OR table_name LIKE '%answer%')
        `);
        console.log('  Found:', backupTables.rows.map(r => r.table_name).join(', ') || 'None');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        pool.end();
    }
}

check();
