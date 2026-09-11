import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { prisma } from '../../db.js';
import { runAiAgent } from './provider.js';

export const aiRouter = Router();
aiRouter.use(requireAuth, requirePermission('ai:read'));

const querySchema = z.object({ message: z.string().min(3).max(1200) });

aiRouter.post('/query', async (req, res, next) => {
  try {
    const { message } = querySchema.parse(req.body);
    const result = await runAiAgent(message, { tenantId: req.auth!.tenantId, userId: req.auth!.userId });
    await prisma.auditEvent.create({
      data: {
        tenantId: req.auth!.tenantId,
        userId: req.auth!.userId,
        action: 'EXECUTE',
        entityType: 'AIAgent',
        metadata: { mode: result.mode, message: message.slice(0, 300), toolName: result.toolName }
      }
    });
    res.json({ data: result });
  } catch (e) { next(e); }
});

aiRouter.get('/tools', async (_req, res) => {
  res.json({ data: [] });
});
