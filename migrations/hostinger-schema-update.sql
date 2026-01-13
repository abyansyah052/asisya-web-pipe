-- =============================================
-- HOSTINGER DATABASE SCHEMA UPDATE
-- Date: 2026-01-14
-- Description: Combined migrations for Hostinger VPS
-- Run via: psql -h localhost -U asisya_user -d asisya_db -f hostinger-schema-update.sql
-- Or: cat hostinger-schema-update.sql | mysql -u user -p database
-- =============================================

-- =============================================
-- 1. MIGRATION TRACKING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    applied_by VARCHAR(255) DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_migrations_filename ON _migrations(filename);

-- =============================================
-- 2. EXAM ANSWERS TABLE (for answer persistence)
-- =============================================
CREATE TABLE IF NOT EXISTS exam_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id) ON DELETE SET NULL,
    answered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question_id ON exam_answers(question_id);

-- =============================================
-- 3. PSS/SRQ RESULT COLUMNS
-- =============================================
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS pss_result TEXT;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS pss_category VARCHAR(50);
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS srq_result TEXT;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS srq_conclusion VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_pss_category ON exam_attempts(pss_category) WHERE pss_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_attempts_srq_conclusion ON exam_attempts(srq_conclusion) WHERE srq_conclusion IS NOT NULL;

-- =============================================
-- 4. PERFORMANCE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_candidate_codes_candidate_exam ON candidate_codes(candidate_id, exam_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);

-- =============================================
-- 5. COMPANY CODES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS company_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_codes_code ON company_codes(code);
CREATE INDEX IF NOT EXISTS idx_company_codes_org ON company_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_codes_active ON company_codes(is_active);

-- Add exam_type column to exams
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exams' AND column_name = 'exam_type'
    ) THEN
        ALTER TABLE exams ADD COLUMN exam_type VARCHAR(20) DEFAULT 'general';
    END IF;
END $$;

-- Add company_code_id to candidate_codes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidate_codes' AND column_name = 'company_code_id'
    ) THEN
        ALTER TABLE candidate_codes ADD COLUMN company_code_id INTEGER REFERENCES company_codes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Default company code
INSERT INTO company_codes (code, company_name, organization_id, is_active)
SELECT '0000', 'Default', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM company_codes WHERE code = '0000');

-- More candidate_codes indexes
CREATE INDEX IF NOT EXISTS idx_candidate_codes_pattern ON candidate_codes(code varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_candidate_codes_company ON candidate_codes(company_code_id) WHERE company_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_codes_created ON candidate_codes(created_at DESC);

-- =============================================
-- 6. CODE SEQUENCES (Race Condition Fix)
-- =============================================
CREATE TABLE IF NOT EXISTS code_sequences (
    prefix VARCHAR(12) PRIMARY KEY,
    next_num INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_code_sequences_prefix ON code_sequences(prefix);

-- Atomic function for code generation
CREATE OR REPLACE FUNCTION get_next_code_number(p_prefix VARCHAR)
RETURNS INTEGER AS $$
DECLARE 
    result INTEGER;
BEGIN
    INSERT INTO code_sequences (prefix, next_num, updated_at) 
    VALUES (p_prefix, 2, CURRENT_TIMESTAMP)
    ON CONFLICT (prefix) DO UPDATE 
    SET next_num = code_sequences.next_num + 1,
        updated_at = CURRENT_TIMESTAMP
    RETURNING next_num - 1 INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Initialize sequences from existing codes
INSERT INTO code_sequences (prefix, next_num)
SELECT 
    LEFT(code, 9) as prefix,
    COALESCE(MAX(CAST(RIGHT(code, 4) AS INTEGER)), 0) + 1 as next_num
FROM candidate_codes 
WHERE code ~ '^[0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$'
GROUP BY LEFT(code, 9)
ON CONFLICT (prefix) DO UPDATE 
SET next_num = GREATEST(code_sequences.next_num, EXCLUDED.next_num);

-- =============================================
-- 7. SOFT DELETE FOR EXAM ATTEMPTS
-- =============================================
ALTER TABLE exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_status_check;

ALTER TABLE exam_attempts 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);

ALTER TABLE exam_attempts 
    ADD CONSTRAINT exam_attempts_status_check 
    CHECK (status IN ('in_progress', 'completed', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_exam_attempts_deleted_at ON exam_attempts(deleted_at);

-- =============================================
-- 8. RECORD MIGRATIONS
-- =============================================
INSERT INTO _migrations (filename) VALUES 
    ('007_exam_answers.sql'),
    ('009_performance_indexes.sql'),
    ('009_pss_srq_results.sql'),
    ('010_company_codes.sql'),
    ('011_code_sequences.sql'),
    ('012_soft_delete_attempts.sql')
ON CONFLICT (filename) DO NOTHING;

-- =============================================
-- DONE - Schema update complete!
-- =============================================
