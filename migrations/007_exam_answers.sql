-- Migration: Create exam_answers table for persisting candidate answers
-- This allows answers to be restored when candidate reconnects/relogs

CREATE TABLE IF NOT EXISTS exam_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id) ON DELETE SET NULL,
    answered_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one answer per question per attempt
    UNIQUE(attempt_id, question_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question_id ON exam_answers(question_id);
