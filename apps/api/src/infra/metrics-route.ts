import type { Express } from 'express';
import { metricsHandler } from './metrics-endpoint.js';

export function registerMetricsRoute(app: Express) {
  app.get('/metrics', metricsHandler);
}
