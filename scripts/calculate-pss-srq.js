/**
 * PSS & SRQ Score Calculator (Offline)
 * Tests scoring algorithms without needing a server
 * Run: node scripts/calculate-pss-srq.js
 */

console.log('🧮 PSS & SRQ Score Calculator');
console.log('👤 Candidate: Abdul Rahman');
console.log('='.repeat(60));

// ============================================================
// SRQ-29 CALCULATION (berdasarkan update.md)
// ============================================================

console.log('\n📊 SRQ-29 (Self Reporting Questionnaire)');
console.log('-'.repeat(50));

// Jawaban SRQ-29: TIDAK=0, YA=1
// TIDAK TIDAK TIDAK TIDAK YA YA TIDAK TIDAK TIDAK TIDAK 
// TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK 
// TIDAK TIDAK TIDAK TIDAK TIDAK TIDAK YA TIDAK TIDAK
const srqAnswers = [
    0, 0, 0, 0, 1, 1, 0, 0, 0, 0,  // Q1-10
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // Q11-20
    0, 0, 0, 0, 0, 0, 1, 0, 0      // Q21-29
];

console.log('Jawaban (0=TIDAK, 1=YA):');
console.log('Q1-10:   ', srqAnswers.slice(0, 10).join(' '));
console.log('Q11-20:  ', srqAnswers.slice(10, 20).join(' '));
console.log('Q21-29:  ', srqAnswers.slice(20, 29).join(' '));

// SRQ-29 Scoring berdasarkan update.md INTERPRETASI:
// 1. Q1-20 >= 5 YA → Cemas/Depresi
// 2. Q21 = YA → Penggunaan Zat
// 3. Q22-24 >= 1 YA → Psikotik  
// 4. Q25-29 >= 1 YA → PTSD

const srqTotal = srqAnswers.reduce((sum, v) => sum + v, 0);

// Kategori berdasarkan update.md
const q1_20Score = srqAnswers.slice(0, 20).reduce((sum, v) => sum + v, 0);  // Cemas/Depresi
const q21Score = srqAnswers[20];  // Penggunaan Zat (Q21 saja)
const q22_24Score = srqAnswers.slice(21, 24).reduce((sum, v) => sum + v, 0);  // Psikotik
const q25_29Score = srqAnswers.slice(24, 29).reduce((sum, v) => sum + v, 0);  // PTSD

const cemasDepresi = q1_20Score >= 5;
const penggunaanZat = q21Score >= 1;
const psikotik = q22_24Score >= 1;
const ptsd = q25_29Score >= 1;

console.log('\n📋 INTERPRETASI SRQ-29:');
console.log(`  Q1-20  (Cemas/Depresi):  ${q1_20Score}/20 ${cemasDepresi ? '⚠️ POSITIF (≥5)' : '✅ Normal (<5)'}`);
console.log(`  Q21    (Penggunaan Zat): ${q21Score}/1  ${penggunaanZat ? '⚠️ POSITIF' : '✅ Normal'}`);
console.log(`  Q22-24 (Psikotik):       ${q22_24Score}/3  ${psikotik ? '⚠️ POSITIF (≥1)' : '✅ Normal (0)'}`);
console.log(`  Q25-29 (PTSD):           ${q25_29Score}/5  ${ptsd ? '⚠️ POSITIF (≥1)' : '✅ Normal (0)'}`);

// Template Output dari update.md
const OUTPUT_TEMPLATES = {
    normal: 'Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi. Tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma',
    ptsdOnly: 'Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.',
    cemasDepresiOnly: 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    psikotikOnly: 'Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma',
    ptsdPsikotik: 'Tidak Normal. Terdapat gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba',
    cemasDepresiPtsd: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan PTSD. Namun tidak terdapat gejala episode psikotik dan penggunaan zat psikoaktif/narkoba',
    cemasDepresiPsikotik: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan gejala episode psikotik. Namun tidak terdapat gejala PTSD dan penggunaan zat psikoaktif/narkoba',
    allSymptoms: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun, tidak terdapat penggunaan zat adiktif/narkoba',
};

// Determine output text
let srqOutputText = OUTPUT_TEMPLATES.normal;
if (!cemasDepresi && !penggunaanZat && !psikotik && ptsd) {
    srqOutputText = OUTPUT_TEMPLATES.ptsdOnly;
} else if (cemasDepresi && !penggunaanZat && !psikotik && !ptsd) {
    srqOutputText = OUTPUT_TEMPLATES.cemasDepresiOnly;
} else if (!cemasDepresi && !penggunaanZat && psikotik && !ptsd) {
    srqOutputText = OUTPUT_TEMPLATES.psikotikOnly;
} else if (!cemasDepresi && !penggunaanZat && psikotik && ptsd) {
    srqOutputText = OUTPUT_TEMPLATES.ptsdPsikotik;
} else if (cemasDepresi && !penggunaanZat && !psikotik && ptsd) {
    srqOutputText = OUTPUT_TEMPLATES.cemasDepresiPtsd;
} else if (cemasDepresi && !penggunaanZat && psikotik && !ptsd) {
    srqOutputText = OUTPUT_TEMPLATES.cemasDepresiPsikotik;
} else if (cemasDepresi && !penggunaanZat && psikotik && ptsd) {
    srqOutputText = OUTPUT_TEMPLATES.allSymptoms;
}

console.log('\n📋 HASIL SRQ-29:');
console.log(`  Total Skor: ${srqTotal}/29`);
console.log(`  Status: ${cemasDepresi || penggunaanZat || psikotik || ptsd ? '⚠️ TIDAK NORMAL' : '✅ NORMAL'}`);
console.log(`\n  Output Text:`);
console.log(`  "${srqOutputText}"`);

// ============================================================
// PSS-10 CALCULATION
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('\n📊 PSS-10 (Perceived Stress Scale)');
console.log('-'.repeat(50));

// Jawaban PSS-10: 1 0 1 3 4 1 3 3 0 0
const pssAnswers = [1, 0, 1, 3, 4, 1, 3, 3, 0, 0];

console.log('Jawaban (skala 0-4):');
console.log('Q1-5:  ', pssAnswers.slice(0, 5).join(' '));
console.log('Q6-10: ', pssAnswers.slice(5, 10).join(' '));

// PSS-10 scoring
// Questions 4, 5, 7, 8 are POSITIVELY worded → need REVERSE scoring
// Reverse: 0→4, 1→3, 2→2, 3→1, 4→0
const positiveQuestions = [4, 5, 7, 8]; // 1-indexed

console.log('\nPerhitungan (Q4, Q5, Q7, Q8 reverse-scored):');

let pssTotal = 0;
pssAnswers.forEach((val, idx) => {
    const qNum = idx + 1;
    const isReversed = positiveQuestions.includes(qNum);
    const scoredVal = isReversed ? (4 - val) : val;
    pssTotal += scoredVal;
    
    if (isReversed) {
        console.log(`  Q${qNum}: ${val} → ${scoredVal} (reversed)`);
    } else {
        console.log(`  Q${qNum}: ${val}`);
    }
});

// Determine stress level berdasarkan update.md
// Kode 1: skor 1-13 = stres ringan
// Kode 2: skor 14-26 = stres sedang  
// Kode 3: skor 27-40 = stres berat
let pssLabel, pssEmoji;
if (pssTotal <= 13) {
    pssLabel = 'Kode 1 Stres Ringan';
    pssEmoji = '✅';
} else if (pssTotal <= 26) {
    pssLabel = 'Kode 2 Stres Sedang';
    pssEmoji = '⚠️';
} else {
    pssLabel = 'Kode 3 Stres Berat';
    pssEmoji = '🔴';
}

console.log('\n📋 HASIL PSS-10:');
console.log(`  Total Skor: ${pssTotal}/40`);
console.log(`  Tingkat Stres: ${pssEmoji} ${pssLabel}`);

console.log('\n  Interpretasi:');
console.log('    Kode 1: skor 1-13 = Stres Ringan');
console.log('    Kode 2: skor 14-26 = Stres Sedang');
console.log('    Kode 3: skor 27-40 = Stres Berat');

// ============================================================
// SUMMARY - FORMAT EXCEL
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('📋 RINGKASAN HASIL ASESMEN');
console.log('='.repeat(60));

console.log('\n👤 Data Kandidat:');
console.log('   Nama:         Abdul Rahman');
console.log('   Email:        abdul.rahman@test.com');
console.log('   Telepon:      081234567890');
console.log('   Tanggal Lahir: 15 Maret 1995');
console.log('   Jenis Kelamin: Laki-laki');
console.log('   Pendidikan:   S1');
console.log('   Pekerjaan:    Software Engineer');

console.log('\n📊 FORMAT EXCEL:');
console.log('\n🔹 PSS-10 Excel Format: [Nama, Gender, Skor Total, Kode Stres]');
console.log(`   Abdul Rahman | Laki-laki | ${pssTotal} | ${pssLabel}`);

console.log('\n🔹 SRQ-29 Excel Format: [Nama, Gender, Skor Total, Output Hasil]');
console.log(`   Abdul Rahman | Laki-laki | ${srqTotal} | ${srqOutputText}`);

console.log('\n✅ Kalkulasi selesai!');
