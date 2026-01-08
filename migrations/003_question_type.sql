-- Migration: Add question_type column to questions table
-- This allows for different question types: 'multiple_choice' (default) and 'scale'

-- Add question_type column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'multiple_choice';

-- For scale questions, we also need to store scale min/max labels
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_min_label VARCHAR(100);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_max_label VARCHAR(100);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_min INTEGER DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_max INTEGER DEFAULT 5;

-- Update existing questions to have explicit type
UPDATE questions SET question_type = 'multiple_choice' WHERE question_type IS NULL;
