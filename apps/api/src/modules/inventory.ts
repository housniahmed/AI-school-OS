import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth, requirePermission('inventory:read'));

inventoryRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { tenantId: req.auth!.tenantId },
      include: { supplier: { select: { name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ data: items.map((i) => ({ ...i, isLow: Number(i.quantity) <= Number(i.minimumQty) })) });
  } catch (e) { next(e); }
});

inventoryRouter.post('/', requirePermission('inventory:write'), async (req, res, next) => {
  try {
    const input = z.object({
      sku: z.string().min(1),
      name: z.string().min(1),
      category: z.string().min(1),
      unit: z.string().min(1),
      quantity: z.coerce.number().nonnegative(),
      minimumQty: z.coerce.number().nonnegative(),
      supplierId: z.string().optional()
    }).parse(req.body);
    const item = await prisma.inventoryItem.create({ data: { tenantId: req.auth!.tenantId, ...input } });
    await prisma.auditEvent.create({ data: { tenantId: req.auth!.tenantId, userId: req.auth!.userId, action: 'CREATE', entityType: 'InventoryItem', entityId: item.id } });
    res.status(201).json({ data: item });
  } catch (e) { next(e); }
});

inventoryRouter.post('/:id/movements', requirePermission('inventory:write'), async (req, res, next) => {
  try {
    const input = z.object({
      type: z.enum(['IN', 'RECEIPT', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
      quantity: z.coerce.number().positive(),
      reason: z.string().max(300).optional()
    }).parse(req.body);
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });
    let delta = 0;
    if (['IN', 'RECEIPT'].includes(input.type)) delta = input.quantity;
    else if (input.type === 'OUT') delta = -input.quantity;
    else delta = input.quantity;
    if (input.type === 'OUT' && Number(item.quantity) < input.quantity) return res.status(400).json({ error: 'Insufficient stock' });
    const updated = await prisma.$transaction([
      prisma.stockMovement.create({ data: { inventoryItemId: item.id, type: input.type, quantity: input.quantity, reason: input.reason } }),
      prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity: { increment: delta } } })
    ]);
    res.status(201).json({ data: updated[1] });
  } catch (e) { next(e); }
});
