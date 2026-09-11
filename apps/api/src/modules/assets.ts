import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import QRCode from 'qrcode';

export const assetsRouter = Router();
assetsRouter.use(requireAuth, requirePermission('assets:read'));

const createSchema = z.object({
  assetCode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  purchaseAmount: z.coerce.number().nonnegative().optional(),
  status: z.enum(['IN_SERVICE', 'IN_REPAIR', 'RETIRED', 'LOST']).default('IN_SERVICE')
});

assetsRouter.get('/', async (req, res, next) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: { maintenance: { orderBy: { openedAt: 'desc' }, take: 3 } }
    });
    res.json({ data: assets });
  } catch (error) { next(error); }
});

assetsRouter.post('/', requirePermission('assets:write'), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const asset = await prisma.asset.create({
      data: {
        tenantId: req.auth!.tenantId,
        qrToken: globalThis.crypto.randomUUID(),
        assetCode: input.assetCode,
        name: input.name,
        category: input.category,
        serialNumber: input.serialNumber,
        location: input.location,
        purchaseAmount: input.purchaseAmount,
        status: input.status
      }
    });
    await prisma.auditEvent.create({
      data: { tenantId: req.auth!.tenantId, userId: req.auth!.userId, action: 'CREATE', entityType: 'Asset', entityId: asset.id }
    });
    res.status(201).json({ data: asset });
  } catch (error) { next(error); }
});

assetsRouter.get('/:id/qr', async (req,res,next) => {
  try { const asset = await prisma.asset.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId }, select: { assetCode: true, name: true, qrToken: true } }); if (!asset) return res.status(404).json({ error: 'Asset not found' }); const payload = JSON.stringify({ type: 'asset', tenant: req.auth!.tenantId, assetCode: asset.assetCode, assetId: req.params.id, token: asset.qrToken }); const svg = await QRCode.toString(payload, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }); res.type('image/svg+xml').send(svg); } catch (e) { next(e); }
});

assetsRouter.get('/:id', async (req, res, next) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      include: { maintenance: { orderBy: { openedAt: 'desc' } }, assignments: { orderBy: { startsAt: 'desc' } } }
    });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json({ data: asset });
  } catch (error) { next(error); }
});
