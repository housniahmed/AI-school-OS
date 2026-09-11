import type { NextFunction, Request, Response } from 'express';
import { recordHttpRequest } from '../infra/metrics.js';

function sanitizeUserAgent(value: string | undefined) {
  return value?.slice(0, 256);
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = performance.now();

  res.on('finish', () => {
    const durationMs = Number((performance.now() - startedAt).toFixed(2));
    recordHttpRequest(req, res.statusCode, durationMs);
    const entry = {
      event: 'http.request',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      userId: req.auth?.userId,
      tenantId: req.auth?.tenantId,
      ip: req.ip,
      userAgent: sanitizeUserAgent(req.get('user-agent'))
    };

    const line = JSON.stringify(entry);
    if (res.statusCode >= 500) console.error(line);
    else if (res.statusCode >= 400) console.warn(line);
    else console.info(line);
  });

  next();
}
