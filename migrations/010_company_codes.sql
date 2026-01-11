-- Migration: Company Codes System
-- Description: Create company_codes table for generating candidate codes with internal identifier
-- Format: MMYY-XXXX-NNNN (Month,Year - InternalCode - Sequential Number)
-- Example: 0126-2010-0001
-- XXXX is a 4-digit internal code managed by superadmin (can represent type+company or any internal numbering)

-- Create company_codes table
CREATE TABLE IF NOT EXISTS company_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,        -- 4-digit internal code (0000-9999)
    company_name VARCHAR(255) NOT NULL,     -- Company/category display name
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_codes_code ON company_codes(code);
CREATE INDEX IF NOT EXISTS idx_company_codes_org ON company_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_codes_active ON company_codes(is_active);

-- Add exam_type column to exams table (if not exists)
-- Types: 'general' (default), 'mmpi', 'pss', 'srq29'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exams' AND column_name = 'exam_type'
    ) THEN
        ALTER TABLE exams ADD COLUMN exam_type VARCHAR(20) DEFAULT 'general';
    END IF;
END $$;

-- Modify candidate_codes table to support new format
-- Add company_code_id reference (optional, for tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidate_codes' AND column_name = 'company_code_id'
    ) THEN
        ALTER TABLE candidate_codes ADD COLUMN company_code_id INTEGER REFERENCES company_codes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Insert some default company codes (can be managed by superadmin)
-- Superadmin determines the 4-digit code format (could be type+company or any internal scheme)
INSERT INTO company_codes (code, company_name, organization_id, is_active)
SELECT '0000', 'Default', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM company_codes WHERE code = '0000');

-- Performance indexes for candidate_codes
CREATE INDEX IF NOT EXISTS idx_candidate_codes_pattern 
ON candidate_codes(code varchar_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_candidate_codes_company 
ON candidate_codes(company_code_id) 
WHERE company_code_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_codes_created 
ON candidate_codes(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE company_codes IS 'Internal code lookup table for candidate code generation. Format: 4-digit code (XXXX) mapped to company/category name. Managed by superadmin.';
COMMENT ON COLUMN candidate_codes.company_code_id IS 'Reference to company_codes table for tracking which internal code was used.';
