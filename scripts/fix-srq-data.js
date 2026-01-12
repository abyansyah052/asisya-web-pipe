#!/usr/bin/env node
/**
 * Fix Script: Recalculate SRQ conclusions and fix srq_result structure
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// SRQ Categories
const SRQ29_CATEGORIES = {
    cemasDepresi: { start: 1, end: 20, threshold: 5 },
    penggunaanZat: { start: 21, end: 21, threshold: 1 },
    psikotik: { start: 22, end: 24, threshold: 1 },
    ptsd: { start: 25, end: 29, threshold: 1 },
};

// Output templates
const OUTPUT_TEMPLATES = {
    normal: 'Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi. Tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma',
    ptsdOnly: 'Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.',
    cemasDepresiOnly: 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    psikotikOnly: 'Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma',
    ptsdPsikotik: 'Tidak Normal. Terdapat gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba',
    cemasDepresiPtsd: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan PTSD. Namun tidak terdapat gejala episode psikotik dan penggunaan zat psikoaktif/narkoba',
    cemasDepresiPsikotik: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan gejala episode psikotik. Namun tidak terdapat gejala PTSD dan penggunaan zat psikoaktif/narkoba',
    allSymptoms: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun, tidak terdapat penggunaan zat adiktif/narkoba',
    zatOnly: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, gejala episode psikotik, dan gejala PTSD/gejala stress setelah trauma',
    zatCemasDepresi: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba dan gejala psikologis seperti cemas dan depresi. Namun tidak terdapat gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    zatPsikotik: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba dan gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, dan gejala PTSD/gejala stress setelah trauma',
    zatPtsd: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba dan gejala PTSD/gejala stress setelah trauma. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, dan gejala episode psikotik',
    zatCemasDepresiPsikotik: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, dan gejala episode psikotik. Namun tidak terdapat gejala PTSD/gejala stress setelah trauma',
    zatCemasDepresiPtsd: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, dan PTSD/gejala stress setelah trauma. Namun tidak terdapat gejala episode psikotik',
    zatPsikotikPtsd: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun tidak terdapat gejala psikologis seperti cemas dan depresi',
    allWithZat: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma',
};

function getOutputText(cemasDepresi, zat, psikotik, ptsd) {
    if (!cemasDepresi && !zat && !psikotik && !ptsd) return OUTPUT_TEMPLATES.normal;
    if (ptsd && !cemasDepresi && !zat && !psikotik) return OUTPUT_TEMPLATES.ptsdOnly;
    if (cemasDepresi && !zat && !psikotik && !ptsd) return OUTPUT_TEMPLATES.cemasDepresiOnly;
    if (psikotik && !cemasDepresi && !zat && !ptsd) return OUTPUT_TEMPLATES.psikotikOnly;
    if (zat && !cemasDepresi && !psikotik && !ptsd) return OUTPUT_TEMPLATES.zatOnly;
    if (psikotik && ptsd && !cemasDepresi && !zat) return OUTPUT_TEMPLATES.ptsdPsikotik;
    if (cemasDepresi && ptsd && !psikotik && !zat) return OUTPUT_TEMPLATES.cemasDepresiPtsd;
    if (cemasDepresi && psikotik && !ptsd && !zat) return OUTPUT_TEMPLATES.cemasDepresiPsikotik;
    if (zat && cemasDepresi && !psikotik && !ptsd) return OUTPUT_TEMPLATES.zatCemasDepresi;
    if (zat && psikotik && !cemasDepresi && !ptsd) return OUTPUT_TEMPLATES.zatPsikotik;
    if (zat && ptsd && !cemasDepresi && !psikotik) return OUTPUT_TEMPLATES.zatPtsd;
    if (cemasDepresi && psikotik && ptsd && !zat) return OUTPUT_TEMPLATES.allSymptoms;
    if (zat && cemasDepresi && psikotik && !ptsd) return OUTPUT_TEMPLATES.zatCemasDepresiPsikotik;
    if (zat && cemasDepresi && ptsd && !psikotik) return OUTPUT_TEMPLATES.zatCemasDepresiPtsd;
    if (zat && psikotik && ptsd && !cemasDepresi) return OUTPUT_TEMPLATES.zatPsikotikPtsd;
    if (cemasDepresi && zat && psikotik && ptsd) return OUTPUT_TEMPLATES.allWithZat;
    return OUTPUT_TEMPLATES.normal;
}

function getSRQConclusion(cemasDepresi, zat, psikotik, ptsd) {
    if (!cemasDepresi && !zat && !psikotik && !ptsd) return 'Normal';
    
    const symptoms = [];
    if (cemasDepresi) symptoms.push('Cemas/Depresi');
    if (zat) symptoms.push('Zat');
    if (psikotik) symptoms.push('Psikotik');
    if (ptsd) symptoms.push('PTSD');
    
    if (symptoms.length === 1) return `Tidak Normal - ${symptoms[0]}`;
    return `Tidak Normal - ${symptoms.join(' + ')}`;
}

async function fixSRQData() {
    const client = await pool.connect();
    try {
        console.log('🔧 FIXING SRQ DATA\n');
        console.log('='.repeat(60) + '\n');

        // Get all SRQ attempts
        const attempts = await client.query(`
            SELECT ea.id, ea.exam_id
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            WHERE e.exam_type = 'srq29' AND ea.status = 'completed'
        `);

        console.log(`Found ${attempts.rows.length} SRQ attempts to process\n`);

        for (const attempt of attempts.rows) {
            console.log(`Processing Attempt #${attempt.id}...`);
            
            // Get answers for this attempt from exam_answers
            const answersRes = await client.query(`
                SELECT q.id as question_id, ans.selected_option_id, o.text as option_text
                FROM exam_answers ans
                JOIN questions q ON ans.question_id = q.id
                JOIN options o ON ans.selected_option_id = o.id
                WHERE ans.attempt_id = $1
                ORDER BY q.id
            `, [attempt.id]);

            if (answersRes.rows.length !== 29) {
                console.log(`  ⚠️ Expected 29 answers, got ${answersRes.rows.length}`);
                continue;
            }

            // Build answers array (0 or 1)
            const answers = answersRes.rows.map(row => 
                row.option_text.toLowerCase() === 'ya' ? 1 : 0
            );

            // Calculate scores
            const cemasDepresiScore = answers.slice(0, 20).reduce((s, a) => s + a, 0);
            const zatScore = answers[20];
            const psikotikScore = answers.slice(21, 24).reduce((s, a) => s + a, 0);
            const ptsdScore = answers.slice(24, 29).reduce((s, a) => s + a, 0);

            const cemasDepresi = cemasDepresiScore >= 5;
            const zat = zatScore >= 1;
            const psikotik = psikotikScore >= 1;
            const ptsd = ptsdScore >= 1;

            const totalScore = answers.reduce((s, a) => s + a, 0);
            const conclusion = getSRQConclusion(cemasDepresi, zat, psikotik, ptsd);
            const outputText = getOutputText(cemasDepresi, zat, psikotik, ptsd);

            // Build proper srq_result structure
            const srqResult = {
                neurosis: cemasDepresiScore,
                psychosis: psikotikScore,
                ptsd: ptsdScore,
                substanceUse: zatScore,
                totalScore: totalScore,
                categories: [
                    { category: 'cemasDepresi', score: cemasDepresiScore, threshold: 5, positive: cemasDepresi },
                    { category: 'penggunaanZat', score: zatScore, threshold: 1, positive: zat },
                    { category: 'psikotik', score: psikotikScore, threshold: 1, positive: psikotik },
                    { category: 'ptsd', score: ptsdScore, threshold: 1, positive: ptsd }
                ],
                outputText: outputText
            };

            // Update database
            await client.query(`
                UPDATE exam_attempts 
                SET score = $1, srq_result = $2, srq_conclusion = $3
                WHERE id = $4
            `, [totalScore, JSON.stringify(srqResult), conclusion, attempt.id]);

            console.log(`  ✅ Updated: Score=${totalScore}`);
            console.log(`     Neurosis=${cemasDepresiScore}, Zat=${zatScore}, Psikotik=${psikotikScore}, PTSD=${ptsdScore}`);
            console.log(`     Conclusion: "${conclusion}"`);
        }

        console.log('\n✅ SRQ data fix completed!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        pool.end();
    }
}

fixSRQData();
