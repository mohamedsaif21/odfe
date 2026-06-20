#!/bin/bash
set -e

BACKUP_DIR="/var/backups/odfe"
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/odfe_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting ODFE database backup..."
pg_dump -h localhost -U odfe odfe | gzip > "$BACKUP_FILE"

echo "Backup saved: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Rotation: remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "odfe_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "Old backups (older than $RETENTION_DAYS days) removed."
