import type { NextFunction, Request, Response } from 'express';
import { context, trace } from '@opentelemetry/api';
import { renderMetrics, recordHttpRequest } from '../infra/metrics.js';
import { env } from '../config/env.js';

function safeLogPath(req: Request) {
  if (req.route?.path) return `${req.baseUrl}${req.route.path}` || '/';
  if (req.path === '/health' || req.path === '/metrics') return req.path;
  if (req.path.startsWith('/api/')) return '/api/:unmatched';
  return '/:unmatched';
}

function metricsAuthorized(req: Request): boolean {
  if (!env.METRICS_TOKEN) return env.NODE_ENV !== 'production';
  return req.get('authorization') === `Bearer ${env.METRICS_TOKEN}`;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = performance.now();
  const activeSpan = trace.getSpan(context.active());
  const traceId = activeSpan?.spanContext().traceId;

  res.on('finish', () => {
    const durationMs = Number((performance.now() - startedAt).toFixed(2));
    recordHttpRequest(req, res.statusCode, durationMs);
    const entry = {
      event: 'http.request',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      traceId,
      method: req.method,
      path: safeLogPath(req),
      statusCode: res.statusCode,
      durationMs
    };

    const line = JSON.stringify(entry);
    if (res.statusCode >= 500) console.error(line);
    else if (res.statusCode >= 400) console.warn(line);
    else console.info(line);
  });

  if (req.path === '/metrics') {
    if (!metricsAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.type('text/plain; version=0.0.4; charset=utf-8').send(renderMetrics());
    return;
  }

  next();
}
