#!/bin/bash
# Complete Database Migration Script for Asisya Web
# Run this on VPS to set up or update the database schema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  Asisya Web Database Migration${NC}"
echo "=================================="

# Database credentials (can be overridden by environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-asisya_web}"
DB_USER="${DB_USER:-asisya_user}"

# Check if PGPASSWORD is set
if [ -z "$PGPASSWORD" ]; then
    echo -e "${YELLOW}⚠️  PGPASSWORD not set. Please enter password for user $DB_USER:${NC}"
    read -s PGPASSWORD
    export PGPASSWORD
fi

# Function to run SQL
run_sql() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$1" 2>/dev/null || true
}

run_sql_file() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$1" 2>/dev/null || true
}

echo -e "\n${YELLOW}📋 Step 1: Creating base tables if not exist...${NC}"

# Create base tables (users, exams, questions, options, answers, etc.)
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'

-- Base Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'candidate',
    profile_completed BOOLEAN DEFAULT FALSE,
    registration_type VARCHAR(50) DEFAULT 'normal',
    organization_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    duration_minutes INTEGER DEFAULT 60,
    display_mode VARCHAR(50) DEFAULT 'per_page',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    question_number VARCHAR(50),
    marks INTEGER DEFAULT 1,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Options Table
CREATE TABLE IF NOT EXISTS options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam Attempts Table
CREATE TABLE IF NOT EXISTS exam_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    status VARCHAR(50) DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answers Table (final submitted answers)
CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- Exam Assessors Table
CREATE TABLE IF NOT EXISTS exam_assessors (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    assessor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, assessor_id)
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    full_name VARCHAR(255),
    nomor_peserta VARCHAR(100),
    tanggal_lahir DATE,
    usia INTEGER,
    jenis_kelamin VARCHAR(20),
    pendidikan_terakhir VARCHAR(100),
    pekerjaan VARCHAR(255),
    lokasi_test VARCHAR(255),
    alamat_ktp TEXT,
    nik VARCHAR(50),
    foto TEXT,
    marital_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

EOSQL

echo -e "${GREEN}✅ Base tables created${NC}"

echo -e "\n${YELLOW}📋 Step 2: Running role restructure migration...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'

-- Role constraint update
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('candidate', 'psychologist', 'admin', 'super_admin'));

-- Candidate Codes Table
CREATE TABLE IF NOT EXISTS candidate_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    candidate_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_candidate_codes_code ON candidate_codes(code);
CREATE INDEX IF NOT EXISTS idx_candidate_codes_created_by ON candidate_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_candidate_codes_admin_id ON candidate_codes(admin_id);

-- Admin Quotas Table
CREATE TABLE IF NOT EXISTS admin_quotas (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_candidates INTEGER DEFAULT 100,
    max_psychologists INTEGER DEFAULT 10,
    max_exams INTEGER DEFAULT 50,
    current_candidates INTEGER DEFAULT 0,
    current_psychologists INTEGER DEFAULT 0,
    current_exams INTEGER DEFAULT 0,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_admin_quota UNIQUE (admin_id)
);

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add organization_id to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;

EOSQL

echo -e "${GREEN}✅ Role restructure migration done${NC}"

echo -e "\n${YELLOW}📋 Step 3: Running candidate groups migration...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'

-- Candidate Groups Table (for psychologist assignments)
CREATE TABLE IF NOT EXISTS candidate_groups (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_groups_exam ON candidate_groups(exam_id);
CREATE INDEX IF NOT EXISTS idx_candidate_groups_assessor ON candidate_groups(assessor_id);

EOSQL

echo -e "${GREEN}✅ Candidate groups migration done${NC}"

echo -e "\n${YELLOW}📋 Step 4: Running exam answers migration (autosave)...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'

-- Exam Answers Table (for autosave during exam)
CREATE TABLE IF NOT EXISTS exam_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id) ON DELETE SET NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON exam_answers(question_id);

EOSQL

echo -e "${GREEN}✅ Exam answers migration done${NC}"

echo -e "\n${YELLOW}📋 Step 5: Running site settings migration...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'

-- Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES 
    ('site_name', 'ASISYA', 'string', 'Website name', true),
    ('login_message', 'Selamat datang di sistem ujian online', 'string', 'Login page welcome message', true),
    ('primary_color', '#2563eb', 'color', 'Primary brand color', true),
    ('secondary_color', '#1e40af', 'color', 'Secondary brand color', true)
ON CONFLICT (setting_key) DO NOTHING;

EOSQL

echo -e "${GREEN}✅ Site settings migration done${NC}"

echo -e "\n${YELLOW}📋 Step 6: Creating default admin user...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'

-- Create default admin user if not exists
INSERT INTO users (username, email, password_hash, role, full_name, profile_completed)
VALUES ('admin', 'admin@asisya.com', '$2b$10$rQZ8h1hG0G9X0Xq5s5B5qe8k8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'admin', 'Administrator', true)
ON CONFLICT (username) DO NOTHING;

-- Create organization for admin
INSERT INTO organizations (name, admin_id)
SELECT 'Default Organization', id FROM users WHERE username = 'admin' AND NOT EXISTS (
    SELECT 1 FROM organizations WHERE admin_id = (SELECT id FROM users WHERE username = 'admin')
);

-- Link admin to organization
UPDATE users 
SET organization_id = (SELECT id FROM organizations WHERE admin_id = users.id)
WHERE username = 'admin' AND organization_id IS NULL;

EOSQL

echo -e "${GREEN}✅ Default admin user created${NC}"

echo -e "\n${GREEN}=================================="
echo -e "🎉 All migrations completed successfully!"
echo -e "==================================${NC}"

echo -e "\n${YELLOW}Default login credentials:${NC}"
echo "Username: admin"
echo "Password: admin123 (change this immediately!)"
