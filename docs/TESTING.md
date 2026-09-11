# Testing

The API test suite runs against a real PostgreSQL instance in CI and a real Redis instance for distributed rate limiting.

## Commands

```bash
cd apps/api
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm test
```

## Integration environment

Required variables:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `NODE_ENV=test`

The integration suite verifies database readiness, authentication, tenant isolation, and security middleware behavior. Runtime validation is considered complete only when the GitHub Actions API and Web jobs are green.

## Security test policy

Tests must not disable authentication, tenant scoping, rate limiting, or audit behavior merely to simplify setup. When test setup fails, fix the test fixture or application contract instead of weakening the security boundary.
