-- Migration: Add PSS and SRQ result columns to exam_attempts

-- PSS result columns
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS pss_result TEXT;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS pss_category VARCHAR(50);

-- SRQ result columns  
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS srq_result TEXT;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS srq_conclusion VARCHAR(100);

-- Add index for filtering by PSS/SRQ results
CREATE INDEX IF NOT EXISTS idx_exam_attempts_pss_category ON exam_attempts(pss_category) WHERE pss_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_attempts_srq_conclusion ON exam_attempts(srq_conclusion) WHERE srq_conclusion IS NOT NULL;
