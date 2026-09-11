import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../db.js';

export type AuthContext = {
  userId: string;
  tenantId: string;
  roles: string[];
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

type TokenPayload = AuthContext & { iat?: number; exp?: number };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload; req.auth = { userId: payload.userId, tenantId: payload.tenantId, roles: payload.roles ?? [] }; return next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'Authentication required' });

    try {
      const matches = await prisma.user.findFirst({
        where: { id: req.auth.userId, tenantId: req.auth.tenantId, status: 'ACTIVE' },
        select: {
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                  permissions: { select: { permission: { select: { code: true } } } }
                }
              }
            }
          }
        }
      });
      if (!matches) return res.status(401).json({ error: 'User context is no longer valid' });

      const permissions = new Set(matches.roles.flatMap((item) => item.role.permissions.map((p) => p.permission.code)));
      const isSuperAdmin = matches.roles.some((item) => item.role.name === 'SUPER_ADMIN');
      if (!isSuperAdmin && !permissions.has(permission)) {
        return res.status(403).json({ error: `Permission required: ${permission}` });
      }

      req.auth.roles = matches.roles.map((item) => item.role.name);
      next();
    } catch (error) {
      next(error);
    }
  };
}
