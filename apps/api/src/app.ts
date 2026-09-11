import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/observability.js';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { healthRouter } from './modules/health.js';
import { authRouter } from './modules/auth.js';
import { assetsRouter } from './modules/assets.js';
import { maintenanceRouter } from './modules/maintenance.js';
import { dashboardRouter } from './modules/dashboard.js';
import { aiRouter } from './modules/ai/assistant.js';
import { studentsRouter } from './modules/students.js';
import { financeRouter } from './modules/finance.js';
import { inventoryRouter } from './modules/inventory.js';
import { knowledgeRouter } from './modules/knowledge.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRouter);
  app.use('/api/v1', apiRateLimiter);
  app.get('/api/v1', (_req, res) => res.json({ name: 'AI School OS API', version: '0.5.0' }));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/assets', assetsRouter);
  app.use('/api/v1/maintenance', maintenanceRouter);
  app.use('/api/v1/ai', aiRouter);
  app.use('/api/v1/students', studentsRouter);
  app.use('/api/v1/finance', financeRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/knowledge', knowledgeRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({
      event: 'http.error',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      error: message
    }));
    if (err instanceof Error && err.name === 'ZodError') return res.status(400).json({ error: 'Invalid request payload', requestId: req.requestId });
    res.status(500).json({ error: 'Internal server error', requestId: req.requestId });
  });

  return app;
}
