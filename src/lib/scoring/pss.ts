// PSS (Perceived Stress Scale) Scoring System
// 10 questions with 0-4 scale

export const PSS_OPTIONS = [
    { value: 0, label: 'Tidak Pernah', labelEn: 'Never' },
    { value: 1, label: 'Hampir Tidak Pernah', labelEn: 'Almost Never' },
    { value: 2, label: 'Kadang-kadang', labelEn: 'Sometimes' },
    { value: 3, label: 'Cukup Sering', labelEn: 'Fairly Often' },
    { value: 4, label: 'Sangat Sering', labelEn: 'Very Often' },
];

// Questions 4, 5, 7, 8 are positively stated and need to be reversed
export const PSS_REVERSE_QUESTIONS = [4, 5, 7, 8];

export interface PSSResult {
    rawScore: number;
    totalScore: number;  // After reverse scoring
    level: 'ringan' | 'sedang' | 'berat';
    levelLabel: string;
    description: string;
}

/**
 * Calculate PSS score with reverse scoring for questions 4, 5, 7, 8
 * @param answers Array of 10 answers (0-4 each), index 0 = question 1
 * @returns PSSResult object
 */
export function calculatePSSScore(answers: number[]): PSSResult {
    if (answers.length !== 10) {
        throw new Error('PSS requires exactly 10 answers');
    }

    let totalScore = 0;
    let rawScore = 0;

    answers.forEach((answer, index) => {
        const questionNumber = index + 1;
        rawScore += answer;

        // Reverse scoring for questions 4, 5, 7, 8 (0→4, 1→3, 2→2, 3→1, 4→0)
        if (PSS_REVERSE_QUESTIONS.includes(questionNumber)) {
            totalScore += (4 - answer);
        } else {
            totalScore += answer;
        }
    });

    // Determine stress level
    // Kode 1: Skor 1-13 = Stres Ringan
    // Kode 2: Skor 14-26 = Stres Sedang
    // Kode 3: Skor 27-40 = Stres Berat
    let level: 'ringan' | 'sedang' | 'berat';
    let levelLabel: string;
    let description: string;

    if (totalScore <= 13) {
        level = 'ringan';
        levelLabel = 'Kode 1 Stres Ringan';
        description = 'Tingkat stress yang dialami tergolong ringan. Individu mampu mengelola tekanan dengan baik.';
    } else if (totalScore <= 26) {
        level = 'sedang';
        levelLabel = 'Kode 2 Stres Sedang';
        description = 'Tingkat stress yang dialami tergolong sedang. Disarankan untuk melakukan teknik relaksasi dan manajemen stress.';
    } else {
        level = 'berat';
        levelLabel = 'Kode 3 Stres Berat';
        description = 'Tingkat stress yang dialami tergolong berat. Sangat disarankan untuk berkonsultasi dengan profesional kesehatan mental.';
    }

    return {
        rawScore,
        totalScore,
        level,
        levelLabel,
        description
    };
}

// PSS Questions in Indonesian
export const PSS_QUESTIONS = [
    'Dalam sebulan terakhir, seberapa sering Anda merasa kesal karena sesuatu yang terjadi secara tidak terduga?',
    'Dalam sebulan terakhir, seberapa sering Anda merasa tidak mampu mengontrol hal-hal penting dalam hidup Anda?',
    'Dalam sebulan terakhir, seberapa sering Anda merasa gugup dan tertekan?',
    'Dalam sebulan terakhir, seberapa sering Anda merasa yakin tentang kemampuan Anda untuk menangani masalah-masalah pribadi Anda?', // REVERSE
    'Dalam sebulan terakhir, seberapa sering Anda merasa bahwa segala sesuatu berjalan sesuai keinginan Anda?', // REVERSE
    'Dalam sebulan terakhir, seberapa sering Anda merasa tidak bisa mengatasi semua hal yang harus Anda lakukan?',
    'Dalam sebulan terakhir, seberapa sering Anda mampu mengendalikan gangguan dalam hidup Anda?', // REVERSE
    'Dalam sebulan terakhir, seberapa sering Anda merasa bahwa Anda berada di atas segalanya?', // REVERSE
    'Dalam sebulan terakhir, seberapa sering Anda merasa marah karena hal-hal yang terjadi di luar kendali Anda?',
    'Dalam sebulan terakhir, seberapa sering Anda merasa kesulitan menumpuk begitu tinggi sehingga Anda tidak bisa mengatasinya?',
];
