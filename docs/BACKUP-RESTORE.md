# Backup & Restore Runbook

The production database is PostgreSQL. Backups must be encrypted, retained according to the contractual retention policy, and stored outside the application host.

## Backup

```bash
export DATABASE_URL='postgresql://...'
mkdir -p backups
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="backups/schoolos-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

## Restore to a clean database

```bash
export DATABASE_URL='postgresql://...'
createdb schoolos_restore
pg_restore \
  --clean --if-exists \
  --dbname="$DATABASE_URL" \
  backups/schoolos-YYYYMMDDTHHMMSSZ.dump
```

## Before production use

1. Encrypt the backup before off-site transfer.
2. Store backups in a separate administrative/security boundary.
3. Keep multiple retention tiers rather than a single rolling copy.
4. Verify backup integrity automatically.
5. Perform scheduled restore drills in an isolated environment.
6. Record the recovery point and recovery time achieved by each drill.

The repository does not claim a tested recovery-time objective or recovery-point objective yet; those values must be established from an actual deployment and recovery exercise.
