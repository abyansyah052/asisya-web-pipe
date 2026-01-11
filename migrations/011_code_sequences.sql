-- Migration 011: Fix Race Condition in Code Generation
-- Problem: FOR UPDATE only locks EXISTING rows. First code in prefix has NO LOCK!
-- Solution: Use atomic sequence table with UPSERT

-- 1. Create sequence table for atomic code number generation
CREATE TABLE IF NOT EXISTS code_sequences (
    prefix VARCHAR(12) PRIMARY KEY,
    next_num INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_code_sequences_prefix ON code_sequences(prefix);

-- 3. Create atomic function to get next code number
-- Uses INSERT ... ON CONFLICT DO UPDATE (UPSERT) which is ATOMIC
-- This prevents race conditions even with 800 concurrent users!
CREATE OR REPLACE FUNCTION get_next_code_number(p_prefix VARCHAR)
RETURNS INTEGER AS $$
DECLARE 
    result INTEGER;
BEGIN
    -- UPSERT: Insert new row OR update existing row atomically
    -- PostgreSQL guarantees this is a single atomic operation
    INSERT INTO code_sequences (prefix, next_num, updated_at) 
    VALUES (p_prefix, 2, CURRENT_TIMESTAMP)  -- Start with 2 because we return 1 for first insert
    ON CONFLICT (prefix) DO UPDATE 
    SET next_num = code_sequences.next_num + 1,
        updated_at = CURRENT_TIMESTAMP
    RETURNING next_num - 1 INTO result;  -- Return previous value (the one we're using)
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Initialize sequences from existing codes
-- This ensures we don't generate duplicates for existing prefixes
INSERT INTO code_sequences (prefix, next_num)
SELECT 
    LEFT(code, 9) as prefix,  -- e.g., '0126-2010'
    COALESCE(MAX(CAST(RIGHT(code, 4) AS INTEGER)), 0) + 1 as next_num
FROM access_codes 
WHERE code ~ '^[0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$'  -- Match new format MMYY-XXXX-NNNN
GROUP BY LEFT(code, 9)
ON CONFLICT (prefix) DO UPDATE 
SET next_num = GREATEST(code_sequences.next_num, EXCLUDED.next_num);

-- 5. Add comment for documentation
COMMENT ON TABLE code_sequences IS 'Atomic sequence table for access code generation. Prevents race conditions.';
COMMENT ON FUNCTION get_next_code_number(VARCHAR) IS 'Atomically get next code number for a prefix. Thread-safe for concurrent requests.';
