import type { Request, Response } from 'express';
import { renderMetrics } from './metrics.js';

export function metricsHandler(_req: Request, res: Response) {
  res.type('text/plain; version=0.0.4; charset=utf-8').send(renderMetrics());
}
