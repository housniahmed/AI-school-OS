import { Router } from 'express';
import { prisma } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-school-os-api', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', async (_req, res) => {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', dependencies: { database: 'ok' }, latencyMs: Date.now() - startedAt });
  } catch {
    res.status(503).json({ status: 'not_ready', dependencies: { database: 'unavailable' }, latencyMs: Date.now() - startedAt });
  }
});
