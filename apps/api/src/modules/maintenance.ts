import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth, requirePermission('maintenance:read'));

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  assetId: z.string().optional(),
  priority: z.coerce.number().int().min(1).max(5).default(3)
});

maintenanceRouter.get('/', async (req, res, next) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { openedAt: 'desc' }],
      include: { asset: { select: { id: true, assetCode: true, name: true, location: true } }, workOrders: true }
    });
    res.json({ data: requests });
  } catch (error) { next(error); }
});

maintenanceRouter.post('/', requirePermission('maintenance:write'), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    if (input.assetId) {
      const asset = await prisma.asset.findFirst({ where: { id: input.assetId, tenantId: req.auth!.tenantId } });
      if (!asset) return res.status(400).json({ error: 'Asset not found in current tenant' });
    }
    const item = await prisma.maintenanceRequest.create({ data: { ...input, tenantId: req.auth!.tenantId } });
    await prisma.auditEvent.create({ data: { tenantId: req.auth!.tenantId, userId: req.auth!.userId, action: 'CREATE', entityType: 'MaintenanceRequest', entityId: item.id } });
    res.status(201).json({ data: item });
  } catch (error) { next(error); }
});
