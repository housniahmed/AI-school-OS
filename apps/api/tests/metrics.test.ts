import test from 'node:test';
import assert from 'node:assert/strict';
import { recordHttpRequest, renderMetrics, resetMetricsForTests } from '../src/infra/metrics.js';

test('metrics expose low-cardinality HTTP counters and histogram', () => {
  resetMetricsForTests();
  const req = { method: 'GET', baseUrl: '/api/v1/assets', path: '/123', route: { path: '/:id' } } as never;
  recordHttpRequest(req, 200, 42.5);
  const output = renderMetrics();

  assert.match(output, /school_os_http_requests_total\{method="GET",route="\/api\/v1\/assets\/:id",status_class="2xx"\} 1/);
  assert.match(output, /school_os_http_request_duration_milliseconds_bucket\{.*le="50"\} 1/);
  assert.match(output, /school_os_http_request_duration_milliseconds_count\{.*\} 1/);
  assert.doesNotMatch(output, /123/);
});

test('metrics do not include tenant or user labels', () => {
  resetMetricsForTests();
  const req = { method: 'GET', baseUrl: '/api/v1/students', path: '/', route: { path: '/' }, auth: { tenantId: 'tenant-secret', userId: 'user-secret' } } as never;
  recordHttpRequest(req, 500, 12);
  const output = renderMetrics();

  assert.doesNotMatch(output, /tenant-secret|user-secret/);
});
