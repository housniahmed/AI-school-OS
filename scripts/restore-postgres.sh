#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${GPG_PASSPHRASE_FILE:?GPG_PASSPHRASE_FILE is required}"

[[ -f "$BACKUP_FILE" ]] || { echo "Backup file not found" >&2; exit 1; }
[[ -f "${BACKUP_FILE}.sha256" ]] || { echo "Backup checksum file not found" >&2; exit 1; }

sha256sum --check "${BACKUP_FILE}.sha256"

work_dir="$(mktemp -d)"
plain_backup="$work_dir/restore.dump"
cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

umask 077

gpg \
  --batch \
  --pinentry-mode loopback \
  --passphrase-file "$GPG_PASSPHRASE_FILE" \
  --decrypt \
  --output "$plain_backup" \
  "$BACKUP_FILE"

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --dbname="$DATABASE_URL" \
  "$plain_backup"

printf 'Restore completed successfully from %s\n' "$BACKUP_FILE"
