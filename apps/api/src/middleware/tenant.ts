import type { Request, Response, NextFunction } from 'express';

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.tenantId || !req.auth.userId) {
    return res.status(401).json({ error: 'Tenant context missing' });
  }
  next();
}
