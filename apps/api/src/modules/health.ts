import { Router } from 'express';
import { prisma } from '../db.js';
import { redisClient } from '../infra/redis.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-school-os-api', version: '0.5.0', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', async (_req, res) => {
  const startedAt = Date.now();
  const dependencies: Record<string, string> = { database: 'unknown', redis: 'unknown' };

  try {
    await prisma.$queryRaw`SELECT 1`;
    dependencies.database = 'ok';
  } catch {
    dependencies.database = 'unavailable';
  }

  try {
    if (!redisClient.isReady) throw new Error('Redis is not ready');
    await redisClient.ping();
    dependencies.redis = 'ok';
  } catch {
    dependencies.redis = 'unavailable';
  }

  const ready = Object.values(dependencies).every((value) => value === 'ok');
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    dependencies,
    latencyMs: Date.now() - startedAt
  });
});
