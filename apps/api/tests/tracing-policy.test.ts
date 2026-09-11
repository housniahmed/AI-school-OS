import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeTraceRoute } from '../src/middleware/tracing.js';

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

test('trace route normalization never uses dynamic API identifiers', () => {
  assert.equal(normalizeTraceRoute({ path: '/api/v1/assets/asset-123', route: undefined }), '/api/:unmatched');
  assert.equal(normalizeTraceRoute({ path: '/health', route: undefined }), '/health');
  assert.equal(normalizeTraceRoute({ path: '/api/v1/assets', route: { path: '/api/v1/assets' } }), '/api/v1/assets');
  assert.equal(normalizeTraceRoute({ path: '/anything/secret-id', route: undefined }), '/:unmatched');
});

test('request tracing source contains no direct PII fields', () => {
  const tracing = source('src/middleware/tracing.ts');
  const observability = source('src/middleware/observability.ts');

  for (const forbidden of ['req.auth', 'req.user', 'req.tenant', 'req.ip', 'user-agent', 'req.body', 'authorization']) {
    assert.equal(tracing.includes(forbidden), false, `tracing.ts must not reference ${forbidden}`);
    assert.equal(observability.includes(forbidden), false, `observability.ts must not reference ${forbidden}`);
  }
});

test('OpenTelemetry policy disables baggage and host/process resource detection by default', () => {
  const instrumentation = source('src/instrumentation.ts');
  assert.match(instrumentation, /OTEL_PROPAGATORS \?\?= 'tracecontext'/);
  assert.match(instrumentation, /OTEL_NODE_RESOURCE_DETECTORS \?\?= 'none'/);
  assert.match(instrumentation, /OTEL_TRACES_EXPORTER \?\?= 'none'/);
  assert.match(instrumentation, /ignoreOutgoingRequestHook/);
  assert.match(instrumentation, /headersToSpanAttributes: \{\}/);
});
