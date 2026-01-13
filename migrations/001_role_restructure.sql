-- Migration: Role Restructure for B2B Model
-- Description: Update role enum values and add new tables for code-based auth
-- Date: 2025-01-XX

-- =============================================
-- PHASE 1: Update Role Enum
-- =============================================

-- Create new role type with updated values
-- Old roles: candidate, admin, super_admin
-- New roles: candidate, psychologist, admin (owner), super_admin (developer)

-- Step 1: Add new role values to existing enum (if using ENUM type)
-- Note: PostgreSQL doesn't allow direct rename of enum values, so we'll use a workaround

-- First, alter any constraints if needed
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Update existing role values in the correct order:
-- 1. super_admin -> temp_super_admin (temporary)
-- 2. admin -> psychologist 
-- 3. temp_super_admin -> admin

-- Step 1: Rename super_admin to a temporary value first
UPDATE users SET role = 'temp_super_admin' WHERE role = 'super_admin';

-- Step 2: Rename admin to psychologist (this is the psikolog/assesor role)
UPDATE users SET role = 'psychologist' WHERE role = 'admin';

-- Step 3: Rename temp_super_admin to admin (this is the owner/client B2B role)
UPDATE users SET role = 'admin' WHERE role = 'temp_super_admin';

-- Step 4: Create the first super_admin (developer) account manually if needed
-- INSERT INTO users (username, password, email, role) VALUES ('developer', 'hashed_password', 'developer@asisya.com', 'super_admin');

-- Add new constraint with updated role values
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('candidate', 'psychologist', 'admin', 'super_admin'));

-- =============================================
-- PHASE 2: Create Candidate Codes Table
-- =============================================

-- Table for storing candidate access codes
CREATE TABLE IF NOT EXISTS candidate_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- psychologist who created the code
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- admin/owner the candidate belongs to
    candidate_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- linked candidate account (null if not used yet)
    exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL, -- optional: specific exam for this code
    max_uses INTEGER DEFAULT 1, -- how many times this code can be used
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb -- for additional data like candidate name, etc
);

-- Index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_candidate_codes_code ON candidate_codes(code);
CREATE INDEX IF NOT EXISTS idx_candidate_codes_created_by ON candidate_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_candidate_codes_admin_id ON candidate_codes(admin_id);
CREATE INDEX IF NOT EXISTS idx_candidate_codes_active ON candidate_codes(is_active) WHERE is_active = TRUE;

-- =============================================
-- PHASE 3: Update Related Tables
-- =============================================

-- Update exam_assessors table to use new role reference
-- (keeping assessor_id as user id, role check done at application level)

-- Add admin_id to exam_assessors for B2B tracking
ALTER TABLE exam_assessors 
ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 4: Admin/Owner Quota System
-- =============================================

-- Table for tracking admin quotas and usage
CREATE TABLE IF NOT EXISTS admin_quotas (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_candidates INTEGER DEFAULT 100, -- max candidates this admin can have
    max_psychologists INTEGER DEFAULT 10, -- max psychologists under this admin
    max_exams INTEGER DEFAULT 50, -- max exams this admin can create
    current_candidates INTEGER DEFAULT 0,
    current_psychologists INTEGER DEFAULT 0,
    current_exams INTEGER DEFAULT 0,
    valid_until TIMESTAMP WITH TIME ZONE, -- quota expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_admin_quota UNIQUE (admin_id)
);

-- =============================================
-- PHASE 5: Organization/Company Table (for B2B)
-- =============================================

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- owner of this org
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Link users to organizations
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View for counting stats per admin/owner
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
    o.id as org_id,
    o.admin_id,
    o.name as org_name,
    COUNT(DISTINCT CASE WHEN u.role = 'psychologist' THEN u.id END) as psychologist_count,
    COUNT(DISTINCT CASE WHEN u.role = 'candidate' THEN u.id END) as candidate_count,
    COUNT(DISTINCT e.id) as exam_count
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN exams e ON e.created_by = o.admin_id OR e.created_by IN (
    SELECT id FROM users WHERE role = 'psychologist' AND organization_id = o.id
)
GROUP BY o.id, o.admin_id, o.name;

-- =============================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================
-- To rollback, run these commands:
-- 
-- DROP VIEW IF EXISTS admin_stats;
-- ALTER TABLE users DROP COLUMN IF EXISTS organization_id;
-- DROP TABLE IF EXISTS organizations;
-- DROP TABLE IF EXISTS admin_quotas;
-- ALTER TABLE exam_assessors DROP COLUMN IF EXISTS admin_id;
-- DROP TABLE IF EXISTS candidate_codes;
-- 
-- -- Revert role changes:
-- UPDATE users SET role = 'super_admin' WHERE role = 'admin';
-- UPDATE users SET role = 'admin' WHERE role = 'psychologist';
-- 
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('candidate', 'admin', 'super_admin'));
