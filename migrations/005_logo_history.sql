-- Migration: Create logo_history table to store previously used logos
-- This allows users to switch between saved logos

CREATE TABLE IF NOT EXISTS logo_history (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    logo_url TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default Asisya logo
INSERT INTO logo_history (name, logo_url, is_default) VALUES
    ('Asisya (Default)', '/asisya.png', true)
ON CONFLICT DO NOTHING;
