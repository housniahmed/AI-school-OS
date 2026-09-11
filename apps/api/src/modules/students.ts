import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const studentsRouter = Router();
studentsRouter.use(requireAuth, requirePermission('students:read'));

studentsRouter.get('/', async (req, res, next) => {
  try {
    const search = z.string().optional().parse(req.query.search);
    const students = await prisma.student.findMany({
      where: {
        tenantId: req.auth!.tenantId,
        active: true,
        ...(search ? { OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { studentCode: { contains: search, mode: 'insensitive' } }
        ] } : {})
      },
      include: { class: true, guardians: { include: { guardian: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });
    res.json({ data: students });
  } catch (error) { next(error); }
});
