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

## Restore to an isolated database

```bash
export DATABASE_URL='postgresql://...'
createdb schoolos_restore
pg_restore \
  --clean --if-exists \
  --dbname="$DATABASE_URL" \
  backups/schoolos-YYYYMMDDTHHMMSSZ.dump
```

## Production requirements

1. Encrypt backups before off-site transfer.
2. Keep backups in a separate administrative/security boundary.
3. Maintain multiple retention tiers.
4. Verify backup integrity automatically.
5. Perform scheduled restore drills in an isolated environment.
6. Record observed recovery point and recovery time for each drill.

No tested RPO/RTO is claimed yet; those values must be established from an actual deployment and recovery exercise.
