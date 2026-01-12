#!/usr/bin/env node
/**
 * Check answers data for all exam types
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
        console.log('🔍 CHECKING ANSWERS DATA\n');
        console.log('='.repeat(60) + '\n');

        // 1. Check exam_answers table
        console.log('1️⃣ exam_answers table:');
        const examAnswers = await client.query(`
            SELECT ea.id as attempt_id, e.title, e.exam_type,
                   COUNT(ans.id) as answer_count,
                   COUNT(ans.selected_option_id) as has_selection
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            LEFT JOIN exam_answers ans ON ea.id = ans.attempt_id
            WHERE ea.status = 'completed'
            GROUP BY ea.id, e.title, e.exam_type
            ORDER BY e.exam_type, ea.id
        `);
        
        for (const row of examAnswers.rows) {
            const status = row.answer_count > 0 ? '✅' : '❌';
            console.log(`  ${status} Attempt #${row.attempt_id} (${row.exam_type}): ${row.answer_count} answers, ${row.has_selection} with selection`);
        }

        // 2. Check old answers table
        console.log('\n2️⃣ OLD answers table:');
        const oldAnswers = await client.query(`
            SELECT ea.id as attempt_id, e.title, e.exam_type,
                   COUNT(ans.id) as answer_count,
                   COUNT(ans.selected_option_id) as has_selection
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            LEFT JOIN answers ans ON ea.id = ans.attempt_id
            WHERE ea.status = 'completed'
            GROUP BY ea.id, e.title, e.exam_type
            ORDER BY e.exam_type, ea.id
        `);
        
        for (const row of oldAnswers.rows) {
            const status = row.answer_count > 0 ? '✅' : '❌';
            console.log(`  ${status} Attempt #${row.attempt_id} (${row.exam_type}): ${row.answer_count} answers, ${row.has_selection} with selection`);
        }

        // 3. Check SRQ conclusions
        console.log('\n3️⃣ SRQ Conclusions:');
        const srq = await client.query(`
            SELECT id, srq_conclusion, srq_result 
            FROM exam_attempts 
            WHERE srq_conclusion IS NOT NULL
        `);
        
        for (const row of srq.rows) {
            console.log(`  Attempt #${row.id}: ${row.srq_conclusion}`);
            if (row.srq_result) {
                const result = typeof row.srq_result === 'string' ? JSON.parse(row.srq_result) : row.srq_result;
                console.log(`    Result: neurosis=${result.neurosis}, psychosis=${result.psychosis}, ptsd=${result.ptsd}, substance=${result.substanceUse}`);
            }
        }

        // 4. Check PSS categories
        console.log('\n4️⃣ PSS Categories:');
        const pss = await client.query(`
            SELECT id, pss_category, score, pss_result 
            FROM exam_attempts 
            WHERE pss_category IS NOT NULL
        `);
        
        for (const row of pss.rows) {
            console.log(`  Attempt #${row.id}: Score=${row.score}, Category="${row.pss_category}"`);
        }

        // 5. Check sample answer detail
        console.log('\n5️⃣ Sample Answer with Options:');
        const sample = await client.query(`
            SELECT 
                ea.id as attempt_id,
                e.exam_type,
                q.id as question_id,
                q.text as question_text,
                ans.selected_option_id,
                o.text as selected_text,
                o.is_correct
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            JOIN exam_answers ans ON ea.id = ans.attempt_id
            JOIN questions q ON ans.question_id = q.id
            JOIN options o ON ans.selected_option_id = o.id
            WHERE ea.status = 'completed'
            LIMIT 5
        `);

        if (sample.rows.length === 0) {
            console.log('  ❌ No answers found in exam_answers table!');
            
            // Try old table
            const oldSample = await client.query(`
                SELECT 
                    ea.id as attempt_id,
                    e.exam_type,
                    ans.selected_option_id
                FROM exam_attempts ea
                JOIN exams e ON ea.exam_id = e.id
                JOIN answers ans ON ea.id = ans.attempt_id
                WHERE ea.status = 'completed'
                LIMIT 5
            `);
            
            if (oldSample.rows.length > 0) {
                console.log('  ✅ Answers exist in OLD "answers" table');
                for (const row of oldSample.rows) {
                    console.log(`    Attempt #${row.attempt_id}: selected_option_id=${row.selected_option_id}`);
                }
            }
        } else {
            for (const row of sample.rows) {
                console.log(`  ✅ Attempt #${row.attempt_id} (${row.exam_type}): Q${row.question_id}`);
                console.log(`     Selected: ${row.selected_option_id} - "${row.selected_text?.substring(0, 30)}..." (correct: ${row.is_correct})`);
            }
        }

        // 6. Check table existence
        console.log('\n6️⃣ Table Check:');
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('answers', 'exam_answers')
        `);
        console.log('  Tables:', tables.rows.map(r => r.table_name).join(', '));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        pool.end();
    }
}

check();
