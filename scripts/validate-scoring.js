const XLSX = require('xlsx');
const path = require('path');

// =====================================================
// PSS-10 Scoring (from src/lib/scoring/pss.ts)
// =====================================================
const PSS_REVERSED_QUESTIONS = [4, 5, 7, 8]; // 1-indexed: Q4, Q5, Q7, Q8

function calculatePSS(answers) {
    // answers is array of 10 numbers (0-4)
    let totalScore = 0;
    
    for (let i = 0; i < 10; i++) {
        const questionNumber = i + 1; // 1-indexed
        let score = answers[i];
        
        // Reverse scoring for Q4, Q5, Q7, Q8
        if (PSS_REVERSED_QUESTIONS.includes(questionNumber)) {
            score = 4 - score;
        }
        
        totalScore += score;
    }
    
    let levelLabel;
    if (totalScore <= 13) {
        levelLabel = 'Stress Ringan';
    } else if (totalScore <= 26) {
        levelLabel = 'Stress Sedang';
    } else {
        levelLabel = 'Stress Berat';
    }
    
    return { totalScore, levelLabel };
}

// =====================================================
// SRQ-29 Scoring (from src/lib/scoring/srq29.ts)
// =====================================================
const SRQ29_CATEGORIES = {
    cemasDepresi: { start: 1, end: 20, threshold: 5 },
    penggunaanZat: { start: 21, end: 21, threshold: 1 },
    psikotik: { start: 22, end: 24, threshold: 1 },
    ptsd: { start: 25, end: 29, threshold: 1 },
};

const OUTPUT_TEMPLATES = {
    normal: 'Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi.\nTidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma',
    
    cemasDepresiOnly: 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    
    ptsdOnly: 'Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.',
    
    psikotikOnly: 'Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala cemas/depresi, penggunaan zat adiktif/narkoba, dan gejala PTSD/stress setelah trauma',
    
    cemasDepresiPtsd: 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi serta gejala PTSD/gejala stress setelah trauma. Namun tidak terdapat penggunaan zat psikoaktif/narkoba dan gejala episode psikotik',
    
    psikotikPtsd: 'Tidak Normal. Terdapat  gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba',
    
    cemasDepresiPsikotik: 'Tidak Normal. Terdapat gejala psikologis seperti cemas/depresi dan gejala episode psikotik. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma',
    
    allSymptoms: 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, gejala episode psikotik, dan gejala PTSD/gejala stress setelah trauma',
};

function calculateSRQ(answers) {
    // answers is array of 29 values (TIDAK/YA or 0/1)
    const numericAnswers = answers.map(a => {
        if (typeof a === 'number') return a;
        return a === 'YA' ? 1 : 0;
    });
    
    // Calculate category scores
    const categoryScores = {};
    const categoryFlags = {};
    
    for (const [category, config] of Object.entries(SRQ29_CATEGORIES)) {
        let score = 0;
        for (let q = config.start; q <= config.end; q++) {
            score += numericAnswers[q - 1] || 0;
        }
        categoryScores[category] = score;
        categoryFlags[category] = score >= config.threshold;
    }
    
    const totalScore = numericAnswers.reduce((a, b) => a + b, 0);
    
    // Determine output text based on flags
    const { cemasDepresi, penggunaanZat, psikotik, ptsd } = categoryFlags;
    
    let outputText;
    
    // Check for penggunaanZat - if present, likely allSymptoms or needs special handling
    if (penggunaanZat) {
        outputText = OUTPUT_TEMPLATES.allSymptoms;
    } else if (!cemasDepresi && !psikotik && !ptsd) {
        outputText = OUTPUT_TEMPLATES.normal;
    } else if (cemasDepresi && !psikotik && !ptsd) {
        outputText = OUTPUT_TEMPLATES.cemasDepresiOnly;
    } else if (!cemasDepresi && !psikotik && ptsd) {
        outputText = OUTPUT_TEMPLATES.ptsdOnly;
    } else if (!cemasDepresi && psikotik && !ptsd) {
        outputText = OUTPUT_TEMPLATES.psikotikOnly;
    } else if (cemasDepresi && !psikotik && ptsd) {
        outputText = OUTPUT_TEMPLATES.cemasDepresiPtsd;
    } else if (!cemasDepresi && psikotik && ptsd) {
        outputText = OUTPUT_TEMPLATES.psikotikPtsd;
    } else if (cemasDepresi && psikotik && !ptsd) {
        outputText = OUTPUT_TEMPLATES.cemasDepresiPsikotik;
    } else {
        outputText = OUTPUT_TEMPLATES.allSymptoms;
    }
    
    return {
        totalScore,
        categoryScores,
        categoryFlags,
        outputText,
    };
}

// =====================================================
// Main Validation
// =====================================================
const workbook = XLSX.readFile(path.join(__dirname, '../data_train.xlsx'));

// Read sheets
const jawabanSheet = workbook.Sheets['Jawaban'];
const srqSheet = workbook.Sheets['SRQ'];
const pssSheet = workbook.Sheets['PSS'];

const jawabanData = XLSX.utils.sheet_to_json(jawabanSheet, { header: 1 });
const srqData = XLSX.utils.sheet_to_json(srqSheet, { header: 1 });
const pssData = XLSX.utils.sheet_to_json(pssSheet, { header: 1 });

// Build expected results lookup
const expectedSRQ = {};
const expectedPSS = {};

// SRQ results - names are in row 0, results in row 1
srqData[0].forEach((name, idx) => {
    expectedSRQ[name.trim()] = srqData[1][idx];
});

// PSS results - names are in row 0, results in row 1
pssData[0].forEach((name, idx) => {
    expectedPSS[name.trim()] = pssData[1][idx];
});

console.log('🔍 VALIDASI SCORING PSS & SRQ');
console.log('='.repeat(80));
console.log(`Total peserta: ${jawabanData.length - 1}`);
console.log('');

let pssMatches = 0;
let pssMismatches = 0;
let srqMatches = 0;
let srqMismatches = 0;

const pssErrors = [];
const srqErrors = [];

// Process each person (skip header row)
for (let i = 0; i < jawabanData.length; i++) {
    const row = jawabanData[i];
    const name = row[0]?.trim();
    
    if (!name) continue;
    
    // Extract answers
    const srqAnswers = row.slice(1, 30); // Columns 1-29 for SRQ
    const pssAnswers = row.slice(30, 40); // Columns 30-39 for PSS
    
    // Calculate scores
    const pssResult = calculatePSS(pssAnswers);
    const srqResult = calculateSRQ(srqAnswers);
    
    // Get expected results
    const expectedPSSResult = expectedPSS[name];
    const expectedSRQResult = expectedSRQ[name];
    
    // Compare PSS
    // Note: Expected uses "Stress Berat", our code uses "Kode 3 Stres Berat"
    // We need to normalize for comparison
    const pssNormalized = pssResult.levelLabel.toLowerCase().replace(/kode \d /i, '');
    const expectedPSSNormalized = expectedPSSResult?.toLowerCase().replace(/kode \d /i, '') || '';
    
    if (pssNormalized === expectedPSSNormalized) {
        pssMatches++;
    } else {
        pssMismatches++;
        pssErrors.push({
            name,
            answers: pssAnswers,
            calculated: pssResult,
            expected: expectedPSSResult,
        });
    }
    
    // Compare SRQ (normalize whitespace)
    const srqNormalized = srqResult.outputText.replace(/\s+/g, ' ').trim();
    const expectedSRQNormalized = expectedSRQResult?.replace(/\s+/g, ' ').trim() || '';
    
    if (srqNormalized === expectedSRQNormalized) {
        srqMatches++;
    } else {
        srqMismatches++;
        srqErrors.push({
            name,
            answers: srqAnswers,
            calculated: srqResult,
            expected: expectedSRQResult,
        });
    }
}

console.log('📊 HASIL VALIDASI PSS-10');
console.log('-'.repeat(80));
console.log(`✅ Cocok: ${pssMatches}`);
console.log(`❌ Tidak Cocok: ${pssMismatches}`);
console.log(`📈 Akurasi: ${((pssMatches / (pssMatches + pssMismatches)) * 100).toFixed(1)}%`);

if (pssErrors.length > 0) {
    console.log('\n🔴 Detail PSS Errors:');
    pssErrors.slice(0, 5).forEach((err, idx) => {
        console.log(`\n  ${idx + 1}. ${err.name}`);
        console.log(`     Jawaban: [${err.answers.join(', ')}]`);
        console.log(`     Skor: ${err.calculated.totalScore}`);
        console.log(`     Hasil Hitung: ${err.calculated.levelLabel}`);
        console.log(`     Hasil Expected: ${err.expected}`);
    });
    if (pssErrors.length > 5) {
        console.log(`\n  ... dan ${pssErrors.length - 5} error lainnya`);
    }
}

console.log('\n');
console.log('📊 HASIL VALIDASI SRQ-29');
console.log('-'.repeat(80));
console.log(`✅ Cocok: ${srqMatches}`);
console.log(`❌ Tidak Cocok: ${srqMismatches}`);
console.log(`📈 Akurasi: ${((srqMatches / (srqMatches + srqMismatches)) * 100).toFixed(1)}%`);

if (srqErrors.length > 0) {
    console.log('\n🔴 Detail SRQ Errors:');
    srqErrors.slice(0, 5).forEach((err, idx) => {
        console.log(`\n  ${idx + 1}. ${err.name}`);
        console.log(`     Jawaban: [${err.answers.slice(0, 10).join(', ')}...]`);
        console.log(`     Skor Total: ${err.calculated.totalScore}`);
        console.log(`     Category Scores: ${JSON.stringify(err.calculated.categoryScores)}`);
        console.log(`     Category Flags: ${JSON.stringify(err.calculated.categoryFlags)}`);
        console.log(`     Hasil Hitung: ${err.calculated.outputText.substring(0, 80)}...`);
        console.log(`     Hasil Expected: ${err.expected?.substring(0, 80)}...`);
    });
    if (srqErrors.length > 5) {
        console.log(`\n  ... dan ${srqErrors.length - 5} error lainnya`);
    }
}

console.log('\n');
console.log('='.repeat(80));
console.log('🏁 RINGKASAN');
console.log('='.repeat(80));
console.log(`PSS-10: ${pssMatches}/${pssMatches + pssMismatches} (${((pssMatches / (pssMatches + pssMismatches)) * 100).toFixed(1)}%)`);
console.log(`SRQ-29: ${srqMatches}/${srqMatches + srqMismatches} (${((srqMatches / (srqMatches + srqMismatches)) * 100).toFixed(1)}%)`);

