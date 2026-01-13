-- Migration: Authentication & Authorization System Update
-- Description: Add is_active, registration_type, and update credentials
-- Date: 2026-01-06

-- =============================================
-- PHASE 1: Add new columns to users table
-- =============================================

-- is_active: Untuk mengaktifkan akun psikolog oleh Admin Owner
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- registration_type: Untuk membedakan user yang registrasi via halaman psikolog vs kode kandidat
-- Values: 'psychologist_page', 'candidate_code', 'manual' (dibuat oleh admin/superadmin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_type VARCHAR(50) DEFAULT 'manual';

-- =============================================
-- PHASE 2: Update admin_quotas table
-- =============================================

-- token_balance: Untuk Admin Owner - menghitung sisa token
ALTER TABLE admin_quotas ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;
ALTER TABLE admin_quotas ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;

-- =============================================
-- PHASE 3: Update Super Admin Credentials
-- =============================================

-- Hapus super_admin lama jika ada, buat baru
DELETE FROM users WHERE role = 'super_admin';

-- Password: SemogaKaya2027
INSERT INTO users (username, email, password_hash, role, is_active, registration_type, profile_completed)
VALUES (
    'dev.asisya.adm', 
    'dev@asisya.com', 
    '$2b$10$8yo8DuJvcZ1gRqfcB6y2beoJ1GToJSknS/i0wGPQsOuiVmGAYCSTK', 
    'super_admin', 
    TRUE, 
    'manual',
    TRUE
);

-- =============================================
-- PHASE 4: Create Sample Admin Owner
-- =============================================

-- Password: AdminOwner2026
INSERT INTO users (username, email, password_hash, role, is_active, registration_type, profile_completed)
VALUES (
    'admin.owner',
    'adminowner@asisya.com',
    '$2b$10$XeDxMS1Ycg0LsgO7tqgDEezwGgQ9Ir16qyJ3HniD6NfjoQh9HbM5W',
    'admin',
    TRUE,
    'manual',
    TRUE
)
ON CONFLICT (username) DO UPDATE SET 
    role = 'admin', 
    is_active = TRUE,
    password_hash = '$2b$10$XeDxMS1Ycg0LsgO7tqgDEezwGgQ9Ir16qyJ3HniD6NfjoQh9HbM5W';

-- Create quota for the admin owner
INSERT INTO admin_quotas (admin_id, max_candidates, max_psychologists, max_exams, token_balance, tokens_used)
SELECT id, 100, 10, 50, 1000, 0
FROM users WHERE username = 'admin.owner'
ON CONFLICT (admin_id) DO UPDATE SET token_balance = 1000;

-- =============================================
-- PHASE 5: Add expires_at to candidate_codes if not exists
-- =============================================

ALTER TABLE candidate_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- CREDENTIALS SUMMARY
-- =============================================
-- 
-- Super Admin:
--   Username: dev.asisya.adm
--   Password: SemogaKaya2027
--   
-- Admin Owner:
--   Username: admin.owner
--   Password: AdminOwner2026
--   Token Balance: 1000
--
