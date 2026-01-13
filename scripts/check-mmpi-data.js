#!/usr/bin/env node
/**
 * Check MMPI exam data
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
        console.log('🔍 CHECKING MMPI DATA\n');
        console.log('='.repeat(60) + '\n');

        // Find MMPI exam
        const exams = await client.query(`
            SELECT id, title, exam_type, 
                   (SELECT COUNT(*) FROM questions WHERE exam_id = exams.id) as question_count
            FROM exams 
            WHERE title ILIKE '%mmpi%' OR exam_type = 'mmpi'
            ORDER BY id
        `);
        
        console.log('MMPI Exams found:');
        for (const exam of exams.rows) {
            console.log(`  ID: ${exam.id}, Title: "${exam.title}", Type: ${exam.exam_type}, Questions: ${exam.question_count}`);
            
            // Check attempts
            const attempts = await client.query(`
                SELECT ea.id, ea.user_id, ea.score, ea.status,
                       COALESCE(up.full_name, u.full_name) as student,
                       (SELECT COUNT(*) FROM exam_answers WHERE attempt_id = ea.id) as exam_answers_count,
                       (SELECT COUNT(*) FROM answers WHERE attempt_id = ea.id) as old_answers_count
                FROM exam_attempts ea
                JOIN users u ON ea.user_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE ea.exam_id = $1
                ORDER BY ea.id
            `, [exam.id]);
            
            console.log(`  Attempts: ${attempts.rows.length}`);
            for (const att of attempts.rows) {
                console.log(`    - Attempt #${att.id}: ${att.student}, Score: ${att.score}, exam_answers: ${att.exam_answers_count}, old_answers: ${att.old_answers_count}`);
            }
        }

        // Also check general exams with no answers
        console.log('\n\n📋 ALL EXAMS WITHOUT ANSWERS:');
        const noAnswers = await client.query(`
            SELECT e.id, e.title, e.exam_type, ea.id as attempt_id,
                   COALESCE(up.full_name, u.full_name) as student,
                   ea.score, ea.status
            FROM exams e
            JOIN exam_attempts ea ON e.id = ea.exam_id
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE NOT EXISTS (SELECT 1 FROM exam_answers WHERE attempt_id = ea.id)
            AND ea.status = 'completed'
            ORDER BY e.id, ea.id
            LIMIT 20
        `);
        
        for (const row of noAnswers.rows) {
            console.log(`  Exam "${row.title}" (${row.exam_type}): Attempt #${row.attempt_id} by ${row.student} - NO ANSWERS`);
        }

        console.log('\n\n📊 SUMMARY:');
        const summary = await client.query(`
            SELECT 
                e.exam_type,
                COUNT(DISTINCT ea.id) as total_attempts,
                COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM exam_answers WHERE attempt_id = ea.id) THEN ea.id END) as with_answers,
                COUNT(DISTINCT CASE WHEN NOT EXISTS (SELECT 1 FROM exam_answers WHERE attempt_id = ea.id) THEN ea.id END) as without_answers
            FROM exams e
            JOIN exam_attempts ea ON e.id = ea.exam_id
            WHERE ea.status = 'completed'
            GROUP BY e.exam_type
        `);
        
        for (const row of summary.rows) {
            console.log(`  ${row.exam_type}: ${row.total_attempts} attempts, ${row.with_answers} with answers, ${row.without_answers} without`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        pool.end();
    }
}

check();
