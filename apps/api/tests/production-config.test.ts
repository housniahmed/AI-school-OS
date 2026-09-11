import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig } from '../src/config/production.js';

test('production rejects short JWT secrets', () => {
  assert.throws(() => validateProductionConfig({ nodeEnv: 'production', jwtSecret: 'too-short' }), /at least 32/);
});

test('production rejects insecure default secrets', () => {
  assert.throws(() => validateProductionConfig({ nodeEnv: 'production', jwtSecret: 'dev-only-change-this-secret-please' }), /replaced/);
});

test('development accepts the development secret', () => {
  assert.doesNotThrow(() => validateProductionConfig({ nodeEnv: 'development', jwtSecret: 'dev-only-change-this-secret-please' }));
});
