import { Router } from 'express';
import mongoose from 'mongoose';
import { ticketAi } from '../ai-sdk/ticket-ai';
import { MESSAGES } from '../constants/messages';
import { AppError } from '../utils/errors';
import { ok } from '../utils/response';

const router = Router();

/**
 * Liveness + readiness in one. 503 when the database is down (so a load balancer stops routing
 * here). The AI being unconfigured is reported but does not fail the check: the app degrades.
 */
router.get('/', (_req, res) => {
  const databaseUp = mongoose.connection.readyState === 1;
  if (!databaseUp) throw AppError.unavailable(MESSAGES.common.databaseUnavailable);

  return ok(res, 'Service is healthy.', {
    status: 'healthy',
    uptimeSeconds: Math.round(process.uptime()),
    database: 'connected',
    ai: ticketAi.isConfigured ? 'configured' : 'not_configured (manual / template mode)',
  });
});

export const healthRouter = router;
