#!/usr/bin/env bash
# Backup the FinTrack Postgres database.
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:5432/fintrack" ./scripts/backup.sh [destination]
#
# Creates a dated .sql.gz dump plus a pg_dumpall globals file (roles, etc.)
# and prunes backups older than BACKUP_RETENTION_DAYS (default 14).
#
# Dependencies: pg_dump, pg_dumpall (from libpq), gzip.

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL is required" >&2
  exit 1
fi

DEST="${1:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$DEST"

STAMP="$(date +%Y%m%d-%H%M%S)"
DB_DUMP="$DEST/fintrack-$STAMP.sql.gz"
GLOBALS_DUMP="$DEST/fintrack-globals-$STAMP.sql.gz"

echo "Backing up database to $DB_DUMP"
pg_dump "$DATABASE_URL" --no-owner --clean --if-exists | gzip > "$DB_DUMP"

echo "Backing up globals to $GLOBALS_DUMP"
pg_dumpall --globals-only | gzip > "$GLOBALS_DUMP"

echo "Pruning backups older than ${RETENTION_DAYS} days"
find "$DEST" -name 'fintrack-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Done. Backups in $DEST:"
ls -lh "$DEST"
