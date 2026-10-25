import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { MESSAGES } from '../constants/messages';
import { sendError } from '../utils/response';

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
  /** Defaults to the client IP. */
  keyBy?: (req: Request) => string;
}

/** Builds a limiter whose rejections use the standard API error envelope. */
const createLimiter = ({ windowMs, limit, message, keyBy }: LimiterOptions) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    ...(keyBy ? { keyGenerator: keyBy, validate: { keyGeneratorIpFallback: false } } : {}),
    handler: (_req, res) => {
      sendError(res, 429, 'RATE_LIMITED', message);
    },
  });

/** Slows down credential stuffing against the login endpoint. */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: MESSAGES.auth.tooManyAttempts,
});

/** Caps LLM-backed requests per admin so a runaway client cannot burn the API budget. */
export const aiLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  message: MESSAGES.ticket.aiRateLimited,
  keyBy: (req) => req.auth?.userId ?? 'anonymous',
});
