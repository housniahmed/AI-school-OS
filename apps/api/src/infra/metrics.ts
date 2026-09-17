import type { Request } from 'express';

const DURATION_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

type CounterKey = string;
type Histogram = { count: number; sum: number; buckets: number[] };

const requestCounters = new Map<CounterKey, number>();
const requestDurations = new Map<CounterKey, Histogram>();
let metricsScrapes = 0;

function escapeLabel(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

function labels(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',');
}

function requestRoute(req: Request) {
  const route = req.route?.path;
  if (typeof route === 'string') return `${req.baseUrl}${route}` || '/';
  return req.path.startsWith('/api/') ? 'unmatched_api_route' : req.path === '/health' || req.path.startsWith('/health/') ? 'health' : 'unmatched_route';
}

export function recordHttpRequest(req: Request, statusCode: number, durationMs: number) {
  const labelSet = {
    method: req.method,
    route: requestRoute(req),
    status_class: `${Math.floor(statusCode / 100)}xx`
  };
  const key = labels(labelSet);
  requestCounters.set(key, (requestCounters.get(key) ?? 0) + 1);

  const histogram = requestDurations.get(key) ?? { count: 0, sum: 0, buckets: DURATION_BUCKETS.map(() => 0) };
  histogram.count += 1;
  histogram.sum += durationMs;
  DURATION_BUCKETS.forEach((bucket, index) => {
    if (durationMs <= bucket) histogram.buckets[index] += 1;
  });
  requestDurations.set(key, histogram);
}

export function renderMetrics() {
  metricsScrapes += 1;
  const lines = [
    '# HELP school_os_http_requests_total Total HTTP requests handled by the API.',
    '# TYPE school_os_http_requests_total counter'
  ];

  for (const [labelSet, value] of requestCounters) {
    lines.push(`school_os_http_requests_total{${labelSet}} ${value}`);
  }

  lines.push(
    '# HELP school_os_http_request_duration_milliseconds HTTP request duration histogram.',
    '# TYPE school_os_http_request_duration_milliseconds histogram'
  );
  for (const [labelSet, histogram] of requestDurations) {
    for (let i = 0; i < DURATION_BUCKETS.length; i += 1) {
      lines.push(`school_os_http_request_duration_milliseconds_bucket{${labelSet},le="${DURATION_BUCKETS[i]}"} ${histogram.buckets[i]}`);
    }
    lines.push(`school_os_http_request_duration_milliseconds_bucket{${labelSet},le="+Inf"} ${histogram.count}`);
    lines.push(`school_os_http_request_duration_milliseconds_sum{${labelSet}} ${histogram.sum}`);
    lines.push(`school_os_http_request_duration_milliseconds_count{${labelSet}} ${histogram.count}`);
  }

  lines.push(
    '# HELP school_os_process_uptime_seconds Process uptime in seconds.',
    '# TYPE school_os_process_uptime_seconds gauge',
    `school_os_process_uptime_seconds ${process.uptime()}`,
    '# HELP school_os_metrics_scrapes_total Number of metrics scrapes.',
    '# TYPE school_os_metrics_scrapes_total counter',
    `school_os_metrics_scrapes_total ${metricsScrapes}`
  );

  return `${lines.join('\n')}\n`;
}

export function resetMetricsForTests() {
  requestCounters.clear();
  requestDurations.clear();
  metricsScrapes = 0;
}
