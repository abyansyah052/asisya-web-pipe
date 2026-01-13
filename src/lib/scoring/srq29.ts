// SRQ-29 (Self-Reporting Questionnaire) Scoring System
// 29 Yes/No questions with complex interpretation based on INTERPRETASI from update.md

export const SRQ29_OPTIONS = [
    { value: 0, label: 'Tidak', labelEn: 'No' },
    { value: 1, label: 'Ya', labelEn: 'Yes' },
];

// Question categories for SRQ-29 based on INTERPRETASI:
// Q1-20: Cemas dan Depresi (cutoff >= 5)
// Q21: Penggunaan zat psikoaktif/narkoba
// Q22-24: Gejala gangguan psikotik (cutoff >= 1)
// Q25-29: Gejala PTSD (cutoff >= 1)

export const SRQ29_CATEGORIES = {
    cemasDepresi: { start: 1, end: 20, threshold: 5 },     // Q1-20, threshold >= 5
    penggunaanZat: { start: 21, end: 21, threshold: 1 },   // Q21 only
    psikotik: { start: 22, end: 24, threshold: 1 },        // Q22-24, threshold >= 1
    ptsd: { start: 25, end: 29, threshold: 1 },            // Q25-29, threshold >= 1
};

export interface SRQ29CategoryResult {
    category: string;
    labelId: string;
    labelEn: string;
    score: number;
    threshold: number;
    positive: boolean;
}

export interface SRQ29Result {
    totalScore: number;
    categories: SRQ29CategoryResult[];
    positiveCategories: string[];
    overallStatus: 'normal' | 'abnormal';
    outputText: string;  // The template text to display
}

// 8 Distinct Result Templates from update.md
const OUTPUT_TEMPLATES = {
    normal: 'Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi. Tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma',
    ptsdOnly: 'Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.',
    cemasDepresiOnly: 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    psikotikOnly: 'Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma',
    ptsdPsikotik: 'Tidak Normal. Terdapat gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba',
    cemasDepresiPtsd: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan PTSD. Namun tidak terdapat gejala episode psikotik dan penggunaan zat psikoaktif/narkoba',
    cemasDepresiPsikotik: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan gejala episode psikotik. Namun tidak terdapat gejala PTSD dan penggunaan zat psikoaktif/narkoba',
    allSymptoms: 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun, tidak terdapat penggunaan zat adiktif/narkoba',
    // Additional combinations with substance use
    zatOnly: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, gejala episode psikotik, dan gejala PTSD/gejala stress setelah trauma',
    zatCemasDepresi: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba dan gejala psikologis seperti cemas dan depresi. Namun tidak terdapat gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    zatPsikotik: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba dan gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, dan gejala PTSD/gejala stress setelah trauma',
    zatPtsd: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba dan gejala PTSD/gejala stress setelah trauma. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, dan gejala episode psikotik',
    zatCemasDepresiPsikotik: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, dan gejala episode psikotik. Namun tidak terdapat gejala PTSD/gejala stress setelah trauma',
    zatCemasDepresiPtsd: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, dan PTSD/gejala stress setelah trauma. Namun tidak terdapat gejala episode psikotik',
    zatPsikotikPtsd: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun tidak terdapat gejala psikologis seperti cemas dan depresi',
    allWithZat: 'Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma',
};

/**
 * Get output text based on positive categories
 */
function getOutputText(cemasDepresi: boolean, zat: boolean, psikotik: boolean, ptsd: boolean): string {
    // No symptoms
    if (!cemasDepresi && !zat && !psikotik && !ptsd) {
        return OUTPUT_TEMPLATES.normal;
    }

    // Single symptom combinations
    if (ptsd && !cemasDepresi && !zat && !psikotik) {
        return OUTPUT_TEMPLATES.ptsdOnly;
    }
    if (cemasDepresi && !zat && !psikotik && !ptsd) {
        return OUTPUT_TEMPLATES.cemasDepresiOnly;
    }
    if (psikotik && !cemasDepresi && !zat && !ptsd) {
        return OUTPUT_TEMPLATES.psikotikOnly;
    }
    if (zat && !cemasDepresi && !psikotik && !ptsd) {
        return OUTPUT_TEMPLATES.zatOnly;
    }

    // Two symptom combinations (no zat)
    if (psikotik && ptsd && !cemasDepresi && !zat) {
        return OUTPUT_TEMPLATES.ptsdPsikotik;
    }
    if (cemasDepresi && ptsd && !psikotik && !zat) {
        return OUTPUT_TEMPLATES.cemasDepresiPtsd;
    }
    if (cemasDepresi && psikotik && !ptsd && !zat) {
        return OUTPUT_TEMPLATES.cemasDepresiPsikotik;
    }

    // Two symptom combinations (with zat)
    if (zat && cemasDepresi && !psikotik && !ptsd) {
        return OUTPUT_TEMPLATES.zatCemasDepresi;
    }
    if (zat && psikotik && !cemasDepresi && !ptsd) {
        return OUTPUT_TEMPLATES.zatPsikotik;
    }
    if (zat && ptsd && !cemasDepresi && !psikotik) {
        return OUTPUT_TEMPLATES.zatPtsd;
    }

    // Three symptom combinations (no zat)
    if (cemasDepresi && psikotik && ptsd && !zat) {
        return OUTPUT_TEMPLATES.allSymptoms;
    }

    // Three symptom combinations (with zat)
    if (zat && cemasDepresi && psikotik && !ptsd) {
        return OUTPUT_TEMPLATES.zatCemasDepresiPsikotik;
    }
    if (zat && cemasDepresi && ptsd && !psikotik) {
        return OUTPUT_TEMPLATES.zatCemasDepresiPtsd;
    }
    if (zat && psikotik && ptsd && !cemasDepresi) {
        return OUTPUT_TEMPLATES.zatPsikotikPtsd;
    }

    // All symptoms
    if (cemasDepresi && zat && psikotik && ptsd) {
        return OUTPUT_TEMPLATES.allWithZat;
    }

    // Fallback (should not happen, but just in case)
    return OUTPUT_TEMPLATES.normal;
}

/**
 * Calculate SRQ-29 score with category-based interpretation
 * Based on update.md INTERPRETASI:
 * 1. Q1-20 >= 5 YA → Cemas/Depresi
 * 2. Q21 = YA → Penggunaan zat
 * 3. Q22-24 >= 1 YA → Psikotik
 * 4. Q25-29 >= 1 YA → PTSD
 * 
 * @param answers Array of 29 answers (0 or 1), index 0 = question 1
 * @returns SRQ29Result object
 */
export function calculateSRQ29Score(answers: number[]): SRQ29Result {
    if (answers.length !== 29) {
        throw new Error('SRQ-29 requires exactly 29 answers');
    }

    const totalScore = answers.reduce((sum, a) => sum + a, 0);
    const categories: SRQ29CategoryResult[] = [];
    const positiveCategories: string[] = [];

    // Calculate Cemas/Depresi score (Q1-20)
    const cemasDepresiScore = answers.slice(0, 20).reduce((sum, a) => sum + a, 0);
    const cemasDepresiPositive = cemasDepresiScore >= SRQ29_CATEGORIES.cemasDepresi.threshold;

    categories.push({
        category: 'cemasDepresi',
        labelId: 'Cemas/Depresi',
        labelEn: 'Anxiety/Depression',
        score: cemasDepresiScore,
        threshold: SRQ29_CATEGORIES.cemasDepresi.threshold,
        positive: cemasDepresiPositive,
    });

    if (cemasDepresiPositive) {
        positiveCategories.push('Cemas/Depresi');
    }

    // Calculate Penggunaan Zat score (Q21 only)
    const zatScore = answers[20]; // Q21 is index 20
    const zatPositive = zatScore >= SRQ29_CATEGORIES.penggunaanZat.threshold;

    categories.push({
        category: 'penggunaanZat',
        labelId: 'Penggunaan Zat Psikoaktif/Narkoba',
        labelEn: 'Psychoactive Substance/Drug Use',
        score: zatScore,
        threshold: SRQ29_CATEGORIES.penggunaanZat.threshold,
        positive: zatPositive,
    });

    if (zatPositive) {
        positiveCategories.push('Penggunaan Zat');
    }

    // Calculate Psikotik score (Q22-24)
    const psikotikScore = answers.slice(21, 24).reduce((sum, a) => sum + a, 0); // Q22-24 is index 21-23
    const psikotikPositive = psikotikScore >= SRQ29_CATEGORIES.psikotik.threshold;

    categories.push({
        category: 'psikotik',
        labelId: 'Gejala Gangguan Psikotik',
        labelEn: 'Psychotic Disorder Symptoms',
        score: psikotikScore,
        threshold: SRQ29_CATEGORIES.psikotik.threshold,
        positive: psikotikPositive,
    });

    if (psikotikPositive) {
        positiveCategories.push('Gejala Psikotik');
    }

    // Calculate PTSD score (Q25-29)
    const ptsdScore = answers.slice(24, 29).reduce((sum, a) => sum + a, 0); // Q25-29 is index 24-28
    const ptsdPositive = ptsdScore >= SRQ29_CATEGORIES.ptsd.threshold;

    categories.push({
        category: 'ptsd',
        labelId: 'Gejala PTSD',
        labelEn: 'PTSD Symptoms',
        score: ptsdScore,
        threshold: SRQ29_CATEGORIES.ptsd.threshold,
        positive: ptsdPositive,
    });

    if (ptsdPositive) {
        positiveCategories.push('Gejala PTSD');
    }

    // Determine overall status
    const overallStatus = positiveCategories.length > 0 ? 'abnormal' : 'normal';

    // Get output text from template
    const outputText = getOutputText(cemasDepresiPositive, zatPositive, psikotikPositive, ptsdPositive);

    return {
        totalScore,
        categories,
        positiveCategories,
        overallStatus,
        outputText,
    };
}

// SRQ-29 Questions in Indonesian (from update.md)
export const SRQ29_QUESTIONS = [
    // Q1-20: Cemas/Depresi indicators
    'Apakah Anda sering merasa sakit kepala?',
    'Apakah Anda kehilangan nafsu makan?',
    'Apakah tidur anda tidak nyenyak?',
    'Apakah anda mudah merasa takut?',
    'Apakah anda merasa cemas, tegang, atau khawatir?',
    'Apakah tangan anda gemetar?',
    'Apakah anda mengalami gangguan pencernaan?',
    'Apakah anda merasa sulit berpikir jernih?',
    'Apakah anda merasa tidak Bahagia?',
    'Apakah anda lebih sering menangis?',
    'Apakah anda merasa sulit untuk menikmati aktivitas sehari-hari?',
    'Apakah anda mengalami kesulitan untuk mengambil keputusan?',
    'Apakah aktivitas/tugas sehari-hari anda terbengkalai?',
    'Apakah anda merasa tidak mampu berperan dalam kehidupan ini?',
    'Apakah anda kehilangan minat terhadap banyak hal?',
    'Apakah anda merasa tidak berharga?',
    'Apakah anda mempunyai pikiran untuk mengakhiri hidup anda?',
    'Apakah anda merasa Lelah sepanjang waktu?',
    'Apakah anda merasa tidak enak di perut?',
    'Apakah anda mudah Lelah?',
    
    // Q21: Penggunaan Zat
    'Apakah anda minum alcohol lebih banyak dari biasanya atau apakah anda menggunakan narkoba?',
    
    // Q22-24: Psikotik
    'Apakah anda yakin bahwa seseorang mencoba mencelakai anda dengan cara tertentu?',
    'Apakah ada yang mengganggu atau hal yang tidak biasa dalam pikiran anda?',
    'Apakah anda pernah mendengar suara tanpa tahu sumbernya atau yang orang lain tidak dapat mendengar?',
    
    // Q25-29: PTSD
    'Apakah anda mengalami mimpi yang mengganggu tentang suatu bencana/musibah atau adakah saat-saat anda seolah mengalami Kembali bencana itu?',
    'Apakah anda menghindari kegiatan, tempat, orang atau pikiran yang mengingatkan anda akan bencana tersebut?',
    'Apakah minat anda terhadap teman dan kegiatan yang biasa anda lakukan berkurang?',
    'Apakah anda merasa sangat terganggu jika berada dalam situasi yang mengingatkan anda akan bencana atau jika anda berpikir tentang bencana itu?',
    'Apakah anda kesulitan memahami atau mengekspresikan perasaan anda?',
];
