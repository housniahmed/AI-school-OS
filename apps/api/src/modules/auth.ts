import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { authRateLimiter } from '../middleware/rate-limit.js';

export const authRouter = Router();

const loginSchema = z.object({
  tenantSlug: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email(),
  password: z.string().min(6)
});

authRouter.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase();
    const tenantSlug = input.tenantSlug?.toLowerCase();

    const users = await prisma.user.findMany({
      where: {
        email: normalizedEmail,
        status: 'ACTIVE',
        ...(tenantSlug ? { tenant: { slug: tenantSlug } } : {})
      },
      include: { tenant: true, roles: { include: { role: true } } }
    });

    if (users.length !== 1) return res.status(401).json({ error: 'Identifiants invalides' });
    const user = users[0];

    const stored = await prisma.userCredential.findUnique({ where: { userId: user.id } });
    if (!stored || !(await bcrypt.compare(input.password, stored.passwordHash))) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const roles = user.roles.map((item) => item.role.name);
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, roles },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        metadata: { requestId: req.requestId }
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles,
        school: user.tenant.name
      }
    });
  } catch (error) {
    next(error);
  }
});
