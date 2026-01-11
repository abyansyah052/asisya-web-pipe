// Scoring index - export all scoring functions
export * from './pss';
export * from './srq29';

// Common types for exam scoring
export type ExamType = 'general' | 'mmpi' | 'pss' | 'srq29';

export interface ScoringResult {
    examType: ExamType;
    rawScore?: number;
    totalScore: number;
    interpretation: string;
    details?: Record<string, any>;
}

// Exam type display names
export const EXAM_TYPE_LABELS: Record<ExamType, { id: string; en: string }> = {
    general: { id: 'Ujian Umum', en: 'General Exam' },
    mmpi: { id: 'MMPI', en: 'MMPI' },
    pss: { id: 'Perceived Stress Scale (PSS)', en: 'Perceived Stress Scale (PSS)' },
    srq29: { id: 'Self-Reporting Questionnaire (SRQ-29)', en: 'Self-Reporting Questionnaire (SRQ-29)' },
};
