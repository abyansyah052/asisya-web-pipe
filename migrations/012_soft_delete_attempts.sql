-- Migration: Add soft delete support for exam_attempts
-- Date: 2026-01-13

-- 1. Drop the old constraint
ALTER TABLE exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_status_check;

-- 2. Add deleted_at and deleted_by columns
ALTER TABLE exam_attempts 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);

-- 3. Add new constraint that includes 'deleted' status
ALTER TABLE exam_attempts 
    ADD CONSTRAINT exam_attempts_status_check 
    CHECK (status IN ('in_progress', 'completed', 'deleted'));

-- 4. Create index for faster soft delete queries
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_deleted_at ON exam_attempts(deleted_at);

-- 5. Add comment
COMMENT ON COLUMN exam_attempts.deleted_at IS 'Timestamp when the attempt was soft deleted';
COMMENT ON COLUMN exam_attempts.deleted_by IS 'User ID who deleted this attempt';
