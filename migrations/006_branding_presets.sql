-- Migration: Upgrade logo_history to branding_presets with full branding info
-- Also add access control for admin branding management

-- Drop old logo_history table if exists and create new branding_presets
DROP TABLE IF EXISTS logo_history;

CREATE TABLE IF NOT EXISTS branding_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    logo_url TEXT NOT NULL,
    company_name VARCHAR(200) NOT NULL DEFAULT 'Asisya Consulting',
    company_tagline VARCHAR(500) NOT NULL DEFAULT 'Platform asesmen psikologi profesional',
    primary_color VARCHAR(20) NOT NULL DEFAULT '#0891b2',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default Asisya branding preset
INSERT INTO branding_presets (name, logo_url, company_name, company_tagline, primary_color, is_default) VALUES
    ('Asisya (Default)', '/asisya.png', 'Asisya Consulting', 'Platform asesmen psikologi profesional', '#0891b2', true)
ON CONFLICT DO NOTHING;

-- Table to track branding update timestamps and permissions
CREATE TABLE IF NOT EXISTS branding_access (
    id SERIAL PRIMARY KEY,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    last_updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_access_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default branding access record
INSERT INTO branding_access (admin_access_enabled) VALUES (false)
ON CONFLICT DO NOTHING;

-- Add site_settings entry for last branding update
INSERT INTO site_settings (setting_key, setting_value) VALUES 
    ('last_branding_update', NOW()::text),
    ('last_branding_updater', ''),
    ('admin_branding_access', 'false')
ON CONFLICT (setting_key) DO NOTHING;
