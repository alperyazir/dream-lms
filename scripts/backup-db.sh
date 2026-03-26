#!/bin/bash
# PostgreSQL backup script for Dream LMS
# Usage: ./scripts/backup-db.sh
# Cron: 0 2 * * * /path/to/dream-lms/scripts/backup-db.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
DB_CONTAINER="${DB_CONTAINER:-dream-lms-db-1}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-app}"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)

# Create backup directory
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

echo "[$(date)] Starting backup of $POSTGRES_DB..."

# Create backup
BACKUP_FILE="$BACKUP_DIR/daily/${POSTGRES_DB}_${DATE}.sql.gz"
docker exec "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Weekly backup (Sunday)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$BACKUP_FILE" "$BACKUP_DIR/weekly/${POSTGRES_DB}_weekly_${DATE}.sql.gz"
    echo "[$(date)] Weekly backup created"
fi

# Retention: delete old daily backups
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +$RETENTION_DAILY -delete
echo "[$(date)] Cleaned daily backups older than $RETENTION_DAILY days"

# Retention: delete old weekly backups
find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +$((RETENTION_WEEKLY * 7)) -delete
echo "[$(date)] Cleaned weekly backups older than $RETENTION_WEEKLY weeks"

echo "[$(date)] Backup complete"
