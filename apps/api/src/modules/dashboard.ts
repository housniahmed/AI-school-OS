import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requirePermission('dashboard:read'));

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const [students, staff, assets, maintenanceOpen, overdue, lowStock, expenses] = await Promise.all([
      prisma.student.count({ where: { tenantId, active: true } }),
      prisma.staff.count({ where: { tenantId, active: true } }),
      prisma.asset.count({ where: { tenantId } }),
      prisma.maintenanceRequest.count({ where: { tenantId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.invoice.findMany({ where: { tenantId, status: 'OVERDUE' }, select: { totalAmount: true, paidAmount: true } }),
      prisma.inventoryItem.findMany({ where: { tenantId }, select: { id: true, name: true, quantity: true, minimumQty: true }, orderBy: { name: 'asc' } }),
      prisma.expense.aggregate({ where: { tenantId }, _sum: { amount: true } })
    ]);

    const overdueAmount = overdue.reduce((sum, item) => sum + Number(item.totalAmount) - Number(item.paidAmount), 0);
    const lowStockItems = lowStock.filter((item) => Number(item.quantity) <= Number(item.minimumQty));

    res.json({
      data: {
        students, staff, assets,
        maintenanceOpen,
        priorityMaintenance: await prisma.maintenanceRequest.count({ where: { tenantId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] }, priority: { lte: 2 } } }),
        overdueInvoices: overdue.length,
        overdueAmount,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 8),
        totalExpenses: Number(expenses._sum.amount ?? 0)
      }
    });
  } catch (error) { next(error); }
});
