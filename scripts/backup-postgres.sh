#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
: "${GPG_PASSPHRASE_FILE:?GPG_PASSPHRASE_FILE is required}"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-35}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
umask 077

plain_backup="$BACKUP_DIR/schoolos-${TIMESTAMP}.dump"
encrypted_backup="${plain_backup}.gpg"
checksum_file="${encrypted_backup}.sha256"

cleanup() {
  rm -f "$plain_backup"
}
trap cleanup EXIT

"$PG_DUMP_BIN" --format=custom --no-owner --no-privileges --file="$plain_backup" "$DATABASE_URL"

gpg \
  --batch \
  --yes \
  --pinentry-mode loopback \
  --passphrase-file "$GPG_PASSPHRASE_FILE" \
  --symmetric \
  --cipher-algo AES256 \
  --output "$encrypted_backup" \
  "$plain_backup"

sha256sum "$encrypted_backup" > "$checksum_file"

# Local retention helper. Production object storage should enforce an equivalent
# lifecycle policy independently of this script.
find "$BACKUP_DIR" -type f -name 'schoolos-*.dump.gpg' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'schoolos-*.dump.gpg.sha256' -mtime "+$RETENTION_DAYS" -delete

printf 'Encrypted backup created: %s\n' "$encrypted_backup"
printf 'Checksum: %s\n' "$checksum_file"
printf 'Retention days: %s\n' "$RETENTION_DAYS"
