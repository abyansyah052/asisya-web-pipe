-- Migration 000: Create migration tracking table
-- This table tracks which migrations have been applied
-- MUST be run first before any other migrations

CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),  -- MD5 hash to detect changes
    applied_by VARCHAR(255) DEFAULT 'github-actions'
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_migrations_filename ON _migrations(filename);

-- Comment
COMMENT ON TABLE _migrations IS 'Tracks applied database migrations. Do not modify manually.';
