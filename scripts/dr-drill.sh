#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required (isolated restore database)}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${GPG_PASSPHRASE_FILE:?GPG_PASSPHRASE_FILE is required}"

RPO_TARGET_MINUTES="${RPO_TARGET_MINUTES:-}"
RTO_TARGET_MINUTES="${RTO_TARGET_MINUTES:-}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"
DRILL_RUN_ID="${DRILL_RUN_ID:-dr-$(date -u +%Y%m%dT%H%M%SZ)}"
PG_PSQL_BIN="${PG_PSQL_BIN:-psql}"

[[ -f "$BACKUP_FILE" ]] || { echo "Backup file not found: $BACKUP_FILE" >&2; exit 1; }
[[ -f "${BACKUP_FILE}.sha256" ]] || { echo "Backup checksum file not found: ${BACKUP_FILE}.sha256" >&2; exit 1; }

if [[ -n "$RPO_TARGET_MINUTES" ]] && ! [[ "$RPO_TARGET_MINUTES" =~ ^[0-9]+$ ]]; then
  echo "RPO_TARGET_MINUTES must be a non-negative integer" >&2
  exit 1
fi
if [[ -n "$RTO_TARGET_MINUTES" ]] && ! [[ "$RTO_TARGET_MINUTES" =~ ^[0-9]+$ ]]; then
  echo "RTO_TARGET_MINUTES must be a non-negative integer" >&2
  exit 1
fi

start_epoch="$(date +%s)"
start_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

sha256sum --check "${BACKUP_FILE}.sha256"
integrity_result="PASS"

backup_basename="$(basename "$BACKUP_FILE")"
backup_timestamp="$(sed -nE 's/^schoolos-([0-9]{8}T[0-9]{6}Z)\.dump\.gpg$/\1/p' <<< "$backup_basename")"
backup_age_minutes="UNKNOWN"
if [[ -n "$backup_timestamp" ]]; then
  backup_date="${backup_timestamp:0:4}-${backup_timestamp:4:2}-${backup_timestamp:6:2}"
  backup_time="${backup_timestamp:9:2}:${backup_timestamp:11:2}:${backup_timestamp:13:2}"
  backup_epoch="$(date -u -d "$backup_date $backup_time UTC" +%s 2>/dev/null || true)"
  if [[ -n "$backup_epoch" ]]; then
    now_epoch="$(date +%s)"
    if (( now_epoch >= backup_epoch )); then
      backup_age_minutes="$(( (now_epoch - backup_epoch) / 60 ))"
    else
      echo "Backup timestamp is in the future: $backup_timestamp" >&2
      exit 1
    fi
  fi
fi

export BACKUP_FILE DATABASE_URL GPG_PASSPHRASE_FILE
bash ./scripts/restore-postgres.sh

restore_end_epoch="$(date +%s)"
restore_end_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
rto_minutes="$(( (restore_end_epoch - start_epoch + 59) / 60 ))"

PGPASSWORD="${PGPASSWORD:-}" "$PG_PSQL_BIN" "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc \
  "SELECT COUNT(*) FROM _prisma_migrations" | grep -Eq '^[[:space:]]*[1-9][0-9]*[[:space:]]*$'

application_validation="PASS"
if [[ -n "$HEALTHCHECK_URL" ]]; then
  curl --fail --silent --show-error --max-time 15 "$HEALTHCHECK_URL" >/dev/null
fi

rpo_result="NOT_MEASURED"
if [[ "$backup_age_minutes" =~ ^[0-9]+$ ]] && [[ -n "$RPO_TARGET_MINUTES" ]]; then
  if (( backup_age_minutes <= RPO_TARGET_MINUTES )); then rpo_result="PASS"; else rpo_result="FAIL"; fi
fi

rto_result="NOT_MEASURED"
if [[ -n "$RTO_TARGET_MINUTES" ]]; then
  if (( rto_minutes <= RTO_TARGET_MINUTES )); then rto_result="PASS"; else rto_result="FAIL"; fi
fi

cat <<EOF
DRILL_RUN_ID=$DRILL_RUN_ID
BACKUP_FILE=$backup_basename
BACKUP_TIMESTAMP=$backup_timestamp
BACKUP_AGE_MINUTES=$backup_age_minutes
INTEGRITY_RESULT=$integrity_result
RESTORE_START=$start_iso
RESTORE_END=$restore_end_iso
RESTORE_DURATION_MINUTES=$rto_minutes
APPLICATION_VALIDATION=$application_validation
RPO_TARGET_MINUTES=${RPO_TARGET_MINUTES:-NOT_SET}
RPO_RESULT=$rpo_result
RTO_TARGET_MINUTES=${RTO_TARGET_MINUTES:-NOT_SET}
RTO_RESULT=$rto_result
EOF

if [[ "$rpo_result" == "FAIL" || "$rto_result" == "FAIL" ]]; then
  exit 2
fi
