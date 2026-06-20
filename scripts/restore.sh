#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo ""
    echo "Restores an ODFE database backup."
    echo "Supports both plain SQL and .sql.gz compressed backups."
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring ODFE database from: $BACKUP_FILE"

case "$BACKUP_FILE" in
    *.gz)
        gunzip -c "$BACKUP_FILE" | psql -h localhost -U odfe odfe
        ;;
    *.sql)
        psql -h localhost -U odfe odfe < "$BACKUP_FILE"
        ;;
    *)
        echo "Error: Unrecognized backup format. Expected .sql or .sql.gz"
        exit 1
        ;;
esac

echo "Restore complete from: $BACKUP_FILE"
