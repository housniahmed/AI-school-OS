# Testing

The API suite runs against real PostgreSQL and Redis services in CI.

## Commands

```bash
cd apps/api
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm test
```

## Required integration environment

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `NODE_ENV=test`

The integration suite verifies database and Redis readiness, authentication, tenant isolation, request correlation, security headers, and the real middleware stack.

Security tests must not disable authentication, tenant scoping, rate limiting, or audit behavior merely to simplify test fixtures.
