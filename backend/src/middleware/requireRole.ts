import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/User';
import { ApiError } from '../utils/ApiError';

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) return next(new ApiError(401, 'Unauthorized'));
    if (!allowed.includes(role)) return next(new ApiError(403, 'Forbidden'));
    return next();
  };
}

