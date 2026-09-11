import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig } from '../src/config/production.js';

const VALID_PRODUCTION = {
  nodeEnv: 'production',
  jwtSecret: 'a-secure-production-secret-with-more-than-32-chars',
  secretsProvider: 'external',
  secretsNamespace: 'ai-school-os/production'
};

test('production rejects short JWT secrets', () => {
  assert.throws(
    () => validateProductionConfig({ ...VALID_PRODUCTION, jwtSecret: 'too-short' }),
    /at least 32/
  );
});

test('production rejects insecure default secrets', () => {
  assert.throws(
    () => validateProductionConfig({ ...VALID_PRODUCTION, jwtSecret: 'dev-only-change-this-secret-please' }),
    /replaced/
  );
});

test('production requires an external secret provider', () => {
  assert.throws(
    () => validateProductionConfig({ ...VALID_PRODUCTION, secretsProvider: 'env' }),
    /SECRETS_PROVIDER must be external/
  );
});

test('production requires a secret namespace', () => {
  assert.throws(
    () => validateProductionConfig({ ...VALID_PRODUCTION, secretsNamespace: '  ' }),
    /SECRETS_NAMESPACE must be configured/
  );
});

test('valid production configuration is accepted', () => {
  assert.doesNotThrow(() => validateProductionConfig(VALID_PRODUCTION));
});

test('development accepts environment-backed secrets', () => {
  assert.doesNotThrow(() => validateProductionConfig({
    nodeEnv: 'development',
    jwtSecret: 'dev-only-change-this-secret-please',
    secretsProvider: 'env'
  }));
});
