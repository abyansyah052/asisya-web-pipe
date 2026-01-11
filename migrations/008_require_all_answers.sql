-- Migration: Add require_all_answers column to exams table
-- This allows exam creators to enforce that all questions must be answered before submission

ALTER TABLE exams ADD COLUMN IF NOT EXISTS require_all_answers BOOLEAN DEFAULT FALSE;

-- Update existing exams to default to FALSE (no change in behavior)
UPDATE exams SET require_all_answers = FALSE WHERE require_all_answers IS NULL;
