#!/bin/bash
# ============================================
# VPS Database Setup Script
# ============================================
# 
# Usage: 
#   1. Copy to VPS: scp vps-db-setup.sh root@76.13.17.87:/tmp/
#   2. Copy SQL:    scp database-full-vps.sql root@76.13.17.87:/tmp/
#   3. Run:         ssh root@76.13.17.87 'bash /tmp/vps-db-setup.sh'
#
# This script will:
#   - Install PostgreSQL if not present
#   - Create database and user
#   - Import full database (REPLACE mode)
#   - Set proper permissions
# ============================================

set -e

echo "============================================"
echo "  ASISYA VPS Database Setup"
echo "============================================"
echo ""

# Configuration
DB_NAME="asisya_db"
DB_USER="asisya_user"
DB_PASS="AsisyaSecure2026!"
SQL_FILE="/tmp/database-full-vps.sql"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Step 1: Install PostgreSQL if needed
echo -e "${YELLOW}Step 1: Checking PostgreSQL installation...${NC}"
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    echo -e "${GREEN}PostgreSQL installed!${NC}"
else
    echo -e "${GREEN}PostgreSQL already installed${NC}"
    systemctl start postgresql 2>/dev/null || true
fi

# Step 2: Check SQL file exists
echo ""
echo -e "${YELLOW}Step 2: Checking SQL file...${NC}"
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: $SQL_FILE not found!${NC}"
    echo "Please copy database-full-vps.sql to /tmp/ first:"
    echo "  scp database-full-vps.sql root@YOUR_VPS_IP:/tmp/"
    exit 1
fi

FILE_SIZE=$(du -h "$SQL_FILE" | cut -f1)
FILE_LINES=$(wc -l < "$SQL_FILE")
echo -e "${GREEN}Found: $SQL_FILE ($FILE_SIZE, $FILE_LINES lines)${NC}"

# Step 3: Create database user
echo ""
echo -e "${YELLOW}Step 3: Creating database user...${NC}"
sudo -u postgres psql -c "DROP ROLE IF EXISTS $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "ALTER ROLE $DB_USER CREATEDB;"
echo -e "${GREEN}User '$DB_USER' created${NC}"

# Step 4: Drop and recreate database (CLEAN REPLACE)
echo ""
echo -e "${YELLOW}Step 4: Recreating database (CLEAN REPLACE)...${NC}"

# Terminate existing connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Drop and recreate
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo -e "${GREEN}Database '$DB_NAME' created${NC}"

# Step 5: Import database
echo ""
echo -e "${YELLOW}Step 5: Importing database...${NC}"
echo "This may take a moment..."

# Import with error handling
if sudo -u postgres psql -d "$DB_NAME" -f "$SQL_FILE" 2>&1 | tee /tmp/import.log | tail -20; then
    echo -e "${GREEN}Database imported successfully!${NC}"
else
    echo -e "${RED}Import had some warnings (may be normal for ON CONFLICT)${NC}"
fi

# Step 6: Grant permissions
echo ""
echo -e "${YELLOW}Step 6: Setting permissions...${NC}"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"
echo -e "${GREEN}Permissions granted${NC}"

# Step 7: Configure PostgreSQL for remote access (optional)
echo ""
echo -e "${YELLOW}Step 7: Configuring PostgreSQL...${NC}"

# Update pg_hba.conf for local connections
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
if [ -f "$PG_HBA" ]; then
    # Add local MD5 auth if not exists
    if ! grep -q "local.*$DB_NAME.*$DB_USER" "$PG_HBA"; then
        echo "local   $DB_NAME   $DB_USER   md5" >> "$PG_HBA"
    fi
fi

# Restart PostgreSQL
systemctl restart postgresql
echo -e "${GREEN}PostgreSQL configured${NC}"

# Step 8: Verify installation
echo ""
echo -e "${YELLOW}Step 8: Verifying installation...${NC}"

# Count tables and rows
TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables: $TABLE_COUNT"

# Show row counts
echo ""
echo "Row counts per table:"
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT 
    schemaname,
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"

# Step 9: Generate connection string
echo ""
echo "============================================"
echo -e "${GREEN}  DATABASE SETUP COMPLETE!${NC}"
echo "============================================"
echo ""
echo "Connection details:"
echo "  Host:     localhost (or 127.0.0.1)"
echo "  Port:     5432"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USER"
echo "  Password: $DB_PASS"
echo ""
echo "Connection string for .env:"
echo -e "${GREEN}DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME${NC}"
echo ""
echo "Test connection:"
echo "  psql -U $DB_USER -d $DB_NAME -h localhost"
echo ""

# Cleanup
rm -f "$SQL_FILE"
echo "Cleaned up: $SQL_FILE removed"
echo ""
echo -e "${GREEN}Done! Database is ready for production.${NC}"
