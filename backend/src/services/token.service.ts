import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { ROLES, Role } from '../constants/domain';
import type { AuthContext } from '../types/express';
import { MESSAGES } from '../constants/messages';
import { AppError } from '../utils/errors';

export const signAccessToken = (context: AuthContext): string =>
  jwt.sign({ role: context.role }, env.jwt.secret, {
    subject: context.userId,
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string): AuthContext => {
  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
    const role = payload.role as Role;
    if (!payload.sub || !ROLES.includes(role)) {
      throw AppError.unauthenticated(MESSAGES.auth.tokenInvalid);
    }
    return { userId: payload.sub, role };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthenticated(MESSAGES.auth.tokenExpired);
    }
    throw AppError.unauthenticated(MESSAGES.auth.tokenInvalid);
  }
};
