import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
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

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/v1', (_req, res) => res.json({ name: 'AI School OS API', version: '0.3.0' }));
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/maintenance', maintenanceRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/finance', financeRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/knowledge', knowledgeRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof Error && err.name === 'ZodError') return res.status(400).json({ error: 'Invalid request payload' });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, () => console.log(`AI School OS API listening on http://localhost:${env.PORT}`));
