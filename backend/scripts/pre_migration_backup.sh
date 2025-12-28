#!/bin/bash

# Pre-Migration Backup Script for Story 24.3
# This script creates a backup of the database before running the book migration

set -e  # Exit on error

echo "========================================================================"
echo "PRE-MIGRATION BACKUP - Story 24.3: Book Service Migration"
echo "========================================================================"
echo ""

# Load environment variables
if [ -f ../.env ]; then
    set -a
    source <(cat ../.env | grep -v '^#' | grep -v '^$')
    set +a
else
    echo "ERROR: .env file not found"
    exit 1
fi

# Database connection details
DB_NAME="${POSTGRES_DB:-app}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_SERVER:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Backup configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pre_migration_24_3_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Creating database backup..."
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  User: $DB_USER"
echo "  Backup file: $BACKUP_FILE"
echo ""

# Create backup
PGPASSWORD="$POSTGRES_PASSWORD" /opt/homebrew/Cellar/libpq/17.5/bin/pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -b \
    -v \
    -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "✓ Backup created successfully!"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $BACKUP_SIZE"
    echo ""
    echo "To restore from this backup, run:"
    echo "  pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $BACKUP_FILE"
    echo ""
else
    echo ""
    echo "✗ Backup failed!"
    exit 1
fi

# Run pre-migration validation
echo "========================================================================"
echo "RUNNING PRE-MIGRATION VALIDATION"
echo "========================================================================"
echo ""

# Check if books table exists and has data
echo "[1/3] Checking books table..."
BOOKS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" /opt/homebrew/Cellar/libpq/17.5/bin/psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM books;" 2>/dev/null || echo "0")

if [ "$BOOKS_COUNT" -eq "0" ]; then
    echo "  WARNING: No books found in database"
else
    echo "  ✓ Found $BOOKS_COUNT books"
fi

# Check for NULL dream_storage_id
echo ""
echo "[2/3] Checking for invalid dream_storage_id..."
NULL_IDS=$(PGPASSWORD="$POSTGRES_PASSWORD" /opt/homebrew/Cellar/libpq/17.5/bin/psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM books WHERE dream_storage_id IS NULL;" 2>/dev/null || echo "0")

if [ "$NULL_IDS" -gt "0" ]; then
    echo "  ✗ ERROR: Found $NULL_IDS books with NULL dream_storage_id"
    echo "  Migration will fail! Fix these books before migrating."
    exit 1
else
    echo "  ✓ All books have dream_storage_id"
fi

# Check for orphaned assignments
echo ""
echo "[3/3] Checking for orphaned records..."
ORPHAN_ASSIGNMENTS=$(PGPASSWORD="$POSTGRES_PASSWORD" /opt/homebrew/Cellar/libpq/17.5/bin/psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM assignments a LEFT JOIN books b ON a.book_id = b.id WHERE a.book_id IS NOT NULL AND b.id IS NULL;" 2>/dev/null || echo "0")

if [ "$ORPHAN_ASSIGNMENTS" -gt "0" ]; then
    echo "  ✗ ERROR: Found $ORPHAN_ASSIGNMENTS orphaned assignments"
    echo "  Migration will fail! Fix these assignments before migrating."
    exit 1
else
    echo "  ✓ No orphaned assignments found"
fi

echo ""
echo "========================================================================"
echo "PRE-MIGRATION VALIDATION PASSED"
echo "========================================================================"
echo ""
echo "✓ Database backup complete: $BACKUP_FILE"
echo "✓ Data validation passed"
echo ""
echo "You can now safely run the migration:"
echo "  cd /Users/alperyazir/Dev/dream-lms/backend"
echo "  alembic upgrade head"
echo ""
echo "========================================================================"
