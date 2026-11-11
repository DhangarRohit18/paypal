import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../../shared/types.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.shopmate_token;

  if (!token) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication session required.' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'shopmate_dev_jwt_secret_change_in_prod_2026_paypal_aegis';
    const payload = jwt.verify(token, secret) as { userId: string; email: string; role: UserRole };
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'Session expired or token invalid.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
      if (!req.userRole || !allowedRoles.includes(req.userRole)) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`
        });
        return;
      }
      next();
    });
  };
}

export const requireAdmin = requireRole(['admin']);
