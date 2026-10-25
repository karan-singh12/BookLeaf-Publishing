import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Role } from '../constants/domain';
import { verifyAccessToken } from '../services/token.service';
import { MESSAGES } from '../constants/messages';
import { AppError } from '../utils/errors';

/** Rejects the request unless it carries a valid `Authorization: Bearer <jwt>` header. */
export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  // Header only. Credentials in a URL leak into logs, history and referrers, so the realtime
  // stream authenticates with this same header (the client reads the stream via fetch).
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthenticated(MESSAGES.auth.tokenMissing);
  }
  req.auth = verifyAccessToken(header.slice('Bearer '.length).trim());
  next();
};

/** Role-based access control. Must run after `authenticate`. */
export const authorize =
  (...allowedRoles: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      throw AppError.forbidden();
    }
    next();
  };

/** Returns the authenticated context, for handlers mounted behind `authenticate`. */
export const requireAuth = (req: Request) => {
  if (!req.auth) throw AppError.unauthenticated();
  return req.auth;
};
