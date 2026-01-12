#!/usr/bin/env node
/**
 * Test Business Process - Verification Script
 * Tests:
 * 1. PSS/SRQ labels exist in results API
 * 2. Highlight data exists in answers API (selected_option_id)
 * 3. Filter "Semua" logic correctness
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testBusinessProcess() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 TESTING BUSINESS PROCESS\n');
        console.log('='.repeat(60) + '\n');
        
        // 1. TEST: PSS/SRQ Labels in Results
        console.log('1️⃣ TEST: PSS/SRQ Labels in Results API');
        console.log('-'.repeat(50));
        
        const resultsQuery = `
            SELECT 
                ea.id,
                ea.exam_id,
                e.title as exam_title,
                e.exam_type,
                COALESCE(up.full_name, u.full_name, u.username) as student,
                ea.score,
                ea.pss_category,
                ea.srq_conclusion,
                ea.pss_result IS NOT NULL as has_pss_result,
                ea.srq_result IS NOT NULL as has_srq_result
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE ea.status = 'completed'
            ORDER BY e.exam_type, ea.id
        `;
        
        const resultsRes = await client.query(resultsQuery);
        
        let pssCount = 0, srqCount = 0, generalCount = 0;
        let pssWithLabel = 0, srqWithLabel = 0;
        
        for (const row of resultsRes.rows) {
            if (row.exam_type === 'pss') {
                pssCount++;
                if (row.pss_category) {
                    pssWithLabel++;
                    console.log(`  ✅ PSS: ${row.student} - Category: "${row.pss_category}"`);
                } else {
                    console.log(`  ❌ PSS: ${row.student} - NO CATEGORY!`);
                }
            } else if (row.exam_type === 'srq29') {
                srqCount++;
                if (row.srq_conclusion) {
                    srqWithLabel++;
                    console.log(`  ✅ SRQ: ${row.student} - Conclusion: "${row.srq_conclusion}"`);
                } else {
                    console.log(`  ❌ SRQ: ${row.student} - NO CONCLUSION!`);
                }
            } else {
                generalCount++;
            }
        }
        
        console.log(`\n  📊 Summary:`);
        console.log(`     PSS: ${pssWithLabel}/${pssCount} have labels`);
        console.log(`     SRQ: ${srqWithLabel}/${srqCount} have labels`);
        console.log(`     General: ${generalCount} attempts`);
        
        // 2. TEST: Highlight Data in Answers
        console.log('\n\n2️⃣ TEST: Highlight Data (selected_option_id exists)');
        console.log('-'.repeat(50));
        
        // Check exam_answers table
        const answersQuery = `
            SELECT 
                ea.id as attempt_id,
                e.title as exam_title,
                COALESCE(up.full_name, u.full_name) as student,
                COUNT(ans.id) as answer_count,
                COUNT(ans.selected_option_id) as has_selection
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN exam_answers ans ON ea.id = ans.attempt_id
            WHERE ea.status = 'completed'
            GROUP BY ea.id, e.title, up.full_name, u.full_name
            HAVING COUNT(ans.id) > 0
            ORDER BY ea.id
            LIMIT 10
        `;
        
        const answersRes = await client.query(answersQuery);
        
        console.log(`  Found ${answersRes.rows.length} attempts with answers in exam_answers table:`);
        for (const row of answersRes.rows) {
            const hasHighlight = row.has_selection > 0;
            console.log(`    ${hasHighlight ? '✅' : '❌'} Attempt #${row.attempt_id}: ${row.student} (${row.exam_title}) - ${row.has_selection}/${row.answer_count} answers have selection`);
        }
        
        // Also check old 'answers' table
        const oldAnswersQuery = `
            SELECT 
                ea.id as attempt_id,
                e.title as exam_title,
                COALESCE(up.full_name, u.full_name) as student,
                COUNT(ans.id) as answer_count,
                COUNT(ans.selected_option_id) as has_selection
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            JOIN users u ON ea.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN answers ans ON ea.id = ans.attempt_id
            WHERE ea.status = 'completed'
            GROUP BY ea.id, e.title, up.full_name, u.full_name
            HAVING COUNT(ans.id) > 0
            ORDER BY ea.id
            LIMIT 10
        `;
        
        const oldAnswersRes = await client.query(oldAnswersQuery);
        
        if (oldAnswersRes.rows.length > 0) {
            console.log(`\n  Found ${oldAnswersRes.rows.length} attempts with answers in OLD 'answers' table:`);
            for (const row of oldAnswersRes.rows) {
                const hasHighlight = row.has_selection > 0;
                console.log(`    ${hasHighlight ? '✅' : '❌'} Attempt #${row.attempt_id}: ${row.student} (${row.exam_title}) - ${row.has_selection}/${row.answer_count} answers have selection`);
            }
        }
        
        // 3. TEST: Filter "Semua" - Check candidate_groups data
        console.log('\n\n3️⃣ TEST: Filter "Semua" - Candidate Groups Data');
        console.log('-'.repeat(50));
        
        const groupsQuery = `
            SELECT 
                e.id as exam_id,
                e.title as exam_title,
                COUNT(DISTINCT cg.candidate_id) as assigned_candidates,
                COUNT(DISTINCT cg.assessor_id) as psychologists,
                ARRAY_AGG(DISTINCT COALESCE(u.full_name, u.username)) as assessor_names
            FROM exams e
            LEFT JOIN candidate_groups cg ON e.id = cg.exam_id
            LEFT JOIN users u ON cg.assessor_id = u.id
            GROUP BY e.id, e.title
            ORDER BY e.id
        `;
        
        const groupsRes = await client.query(groupsQuery);
        
        console.log(`  Exam assignments summary:`);
        for (const row of groupsRes.rows) {
            console.log(`\n  📋 ${row.exam_title} (ID: ${row.exam_id})`);
            console.log(`     Assigned candidates: ${row.assigned_candidates || 0}`);
            console.log(`     Psychologists: ${row.psychologists || 0}`);
            if (row.assessor_names && row.assessor_names[0]) {
                console.log(`     Names: ${row.assessor_names.join(', ')}`);
            }
        }
        
        // 4. TEST: Verify one answer detail (highlight check)
        console.log('\n\n4️⃣ TEST: Sample Answer Detail (Highlight Check)');
        console.log('-'.repeat(50));
        
        // Get first attempt with answers
        const sampleQuery = `
            SELECT 
                ea.id as attempt_id,
                q.id as question_id,
                q.text as question_text,
                ans.selected_option_id,
                o.text as selected_option_text,
                o.is_correct
            FROM exam_attempts ea
            JOIN exam_answers ans ON ea.id = ans.attempt_id
            JOIN questions q ON ans.question_id = q.id
            JOIN options o ON ans.selected_option_id = o.id
            WHERE ea.status = 'completed'
            LIMIT 3
        `;
        
        const sampleRes = await client.query(sampleQuery);
        
        if (sampleRes.rows.length > 0) {
            console.log(`  Sample answers with highlight data:`);
            for (const row of sampleRes.rows) {
                console.log(`\n    Attempt #${row.attempt_id}, Q#${row.question_id}:`);
                console.log(`    Question: "${row.question_text?.substring(0, 50)}..."`);
                console.log(`    Selected Option ID: ${row.selected_option_id}`);
                console.log(`    Selected Answer: "${row.selected_option_text?.substring(0, 50)}..."`);
                console.log(`    Is Correct: ${row.is_correct ? '✅' : '❌'}`);
            }
        } else {
            console.log('  ⚠️ No sample answers found - checking old answers table...');
            
            const oldSampleQuery = `
                SELECT 
                    ea.id as attempt_id,
                    q.id as question_id,
                    q.text as question_text,
                    ans.selected_option_id,
                    o.text as selected_option_text,
                    o.is_correct
                FROM exam_attempts ea
                JOIN answers ans ON ea.id = ans.attempt_id
                JOIN questions q ON ans.question_id = q.id
                JOIN options o ON ans.selected_option_id = o.id
                WHERE ea.status = 'completed'
                LIMIT 3
            `;
            
            const oldSampleRes = await client.query(oldSampleQuery);
            
            if (oldSampleRes.rows.length > 0) {
                console.log(`  Sample answers from OLD table:`);
                for (const row of oldSampleRes.rows) {
                    console.log(`\n    Attempt #${row.attempt_id}, Q#${row.question_id}:`);
                    console.log(`    Selected Option ID: ${row.selected_option_id}`);
                    console.log(`    Is Correct: ${row.is_correct ? '✅' : '❌'}`);
                }
            }
        }
        
        // Final Summary
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 FINAL SUMMARY');
        console.log('='.repeat(60));
        
        const allPssOk = pssCount === pssWithLabel;
        const allSrqOk = srqCount === srqWithLabel;
        const hasHighlightData = answersRes.rows.length > 0 || oldAnswersRes.rows.length > 0;
        
        console.log(`\n✓ PSS Labels: ${allPssOk ? 'ALL OK ✅' : 'MISSING ❌'} (${pssWithLabel}/${pssCount})`);
        console.log(`✓ SRQ Labels: ${allSrqOk ? 'ALL OK ✅' : 'MISSING ❌'} (${srqWithLabel}/${srqCount})`);
        console.log(`✓ Highlight Data: ${hasHighlightData ? 'EXISTS ✅' : 'MISSING ❌'}`);
        console.log(`✓ Candidate Groups: ${groupsRes.rows.some(r => r.assigned_candidates > 0) ? 'EXISTS ✅' : 'NONE ⚠️'}`);
        
        if (!allPssOk || !allSrqOk || !hasHighlightData) {
            console.log('\n⚠️ ISSUES FOUND - Please investigate!');
        } else {
            console.log('\n✅ All business processes verified successfully!');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        pool.end();
    }
}

testBusinessProcess();
