import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

// Accept an upstream id (load balancer, frontend) only if it looks sane; never trust arbitrary input into logs.
const SAFE_ID = /^[\w-]{8,64}$/;

/** Gives every request a correlation id so a user-reported error can be found in the logs. */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.header('x-request-id');
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
