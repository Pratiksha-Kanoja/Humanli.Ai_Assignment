import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../models/User';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};

export function signAccessToken(userId: string, role: UserRole) {
  const payload: AccessTokenPayload = { sub: userId, role };
  const opts: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token');
  }
  const { sub, role } = decoded as Partial<AccessTokenPayload>;
  if (!sub || (role !== 'user' && role !== 'admin')) {
    throw new Error('Invalid token payload');
  }
  return { sub, role };
}

