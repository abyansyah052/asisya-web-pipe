#!/bin/bash
# =============================================================================
# Database Migration Runner
# Automatically runs new migrations that haven't been applied yet
# Tracks applied migrations in _migrations table
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Database Migration Runner${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is required${NC}"
    exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/dbname?sslmode=require
parse_db_url() {
    local url="$1"
    
    # Remove postgresql:// prefix
    url="${url#postgresql://}"
    url="${url#postgres://}"
    
    # Extract user
    DB_USER="${url%%:*}"
    url="${url#*:}"
    
    # Extract password (up to @)
    DB_PASS="${url%%@*}"
    url="${url#*@}"
    
    # Extract host
    DB_HOST="${url%%:*}"
    url="${url#*:}"
    
    # Extract port
    DB_PORT="${url%%/*}"
    url="${url#*/}"
    
    # Extract database name (remove query params)
    DB_NAME="${url%%\?*}"
}

parse_db_url "$DATABASE_URL"

echo -e "${BLUE}Connecting to: ${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"

# Set PGPASSWORD for psql
export PGPASSWORD="$DB_PASS"

# Function to run SQL
run_sql() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q "$@"
}

run_sql_file() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$1" 2>&1
}

# Ensure migrations tracking table exists
echo -e "${YELLOW}Ensuring migration tracking table exists...${NC}"
run_sql -c "
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    applied_by VARCHAR(255) DEFAULT 'github-actions'
);
" 2>/dev/null || true

# Get migrations directory
MIGRATIONS_DIR="${1:-migrations}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: Migrations directory not found: $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Get list of applied migrations
echo -e "${YELLOW}Checking applied migrations...${NC}"
APPLIED=$(run_sql -t -c "SELECT filename FROM _migrations ORDER BY filename;" 2>/dev/null | tr -d ' ' | grep -v '^$' || echo "")

# Count variables
TOTAL=0
APPLIED_COUNT=0
NEW_COUNT=0
FAILED_COUNT=0

# Process each migration file in order
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ ! -f "$migration_file" ]; then
        continue
    fi
    
    filename=$(basename "$migration_file")
    TOTAL=$((TOTAL + 1))
    
    # Check if already applied
    if echo "$APPLIED" | grep -q "^${filename}$"; then
        echo -e "${GREEN}✓${NC} $filename (already applied)"
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
        continue
    fi
    
    # Calculate checksum
    CHECKSUM=$(md5sum "$migration_file" | cut -d' ' -f1)
    
    # Run migration
    echo -e "${YELLOW}▶${NC} Running: $filename"
    
    if OUTPUT=$(run_sql_file "$migration_file" 2>&1); then
        # Record successful migration
        run_sql -c "INSERT INTO _migrations (filename, checksum, applied_by) VALUES ('$filename', '$CHECKSUM', 'migration-runner');" 2>/dev/null
        echo -e "${GREEN}✓${NC} $filename (applied successfully)"
        NEW_COUNT=$((NEW_COUNT + 1))
    else
        echo -e "${RED}✗${NC} $filename (FAILED)"
        echo -e "${RED}Error: $OUTPUT${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        
        # Don't exit on failure - some migrations may be idempotent
        # Check if it's a "already exists" type error
        if echo "$OUTPUT" | grep -qE "already exists|duplicate key"; then
            echo -e "${YELLOW}  → Marking as applied (object already exists)${NC}"
            run_sql -c "INSERT INTO _migrations (filename, checksum, applied_by) VALUES ('$filename', '$CHECKSUM', 'migration-runner-recovered') ON CONFLICT (filename) DO NOTHING;" 2>/dev/null
            NEW_COUNT=$((NEW_COUNT + 1))
            FAILED_COUNT=$((FAILED_COUNT - 1))
        fi
    fi
done

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Migration Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total migrations:    $TOTAL"
echo -e "Already applied:     ${GREEN}$APPLIED_COUNT${NC}"
echo -e "Newly applied:       ${GREEN}$NEW_COUNT${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "Failed:              ${RED}$FAILED_COUNT${NC}"
fi
echo -e "${BLUE}========================================${NC}"

# Exit with error if any failed
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}Some migrations failed!${NC}"
    exit 1
fi

echo -e "${GREEN}All migrations completed successfully!${NC}"
exit 0
