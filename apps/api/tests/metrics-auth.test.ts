import assert from 'node:assert/strict';
import test from 'node:test';

const MODULE = '../src/middleware/observability.js';

async function loadWithEnv(env: Record<string, string>) {
  const original = { ...process.env };
  Object.assign(process.env, env);
  try {
    return await import(`${MODULE}?test=${Date.now()}-${Math.random()}`);
  } finally {
    process.env = original;
  }
}

test('production metrics endpoint requires the configured bearer token', async () => {
  const module = await loadWithEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://ci:ci@localhost:5432/schoolos',
    JWT_SECRET: 'ci-only-secret-with-32-characters-minimum',
    SECRETS_PROVIDER: 'external',
    SECRETS_NAMESPACE: 'ci',
    METRICS_TOKEN: 'metrics-token-with-at-least-32-characters'
  });

  assert.equal(typeof module.requestLogger, 'function');
});

test('production configuration rejects a missing metrics token', async () => {
  const { validateProductionConfig } = await import('../src/config/production.js');

  assert.throws(
    () => validateProductionConfig({
      nodeEnv: 'production',
      jwtSecret: 'ci-only-secret-with-32-characters-minimum',
      secretsProvider: 'external',
      secretsNamespace: 'ci'
    }),
    /METRICS_TOKEN must contain at least 32 characters in production/
  );
});
