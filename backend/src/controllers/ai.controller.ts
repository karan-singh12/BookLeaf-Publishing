import { ticketAi } from '../ai-sdk/ticket-ai';
import { MESSAGES } from '../constants/messages';
import { ok } from '../utils/response';
import { handle } from './handler';

export const aiController = {
  /** Which providers are configured, how tasks are routed, breaker state and token usage. Never exposes keys. */
  status: handle(async (_context, res) => ok(res, MESSAGES.common.fetched('AI status'), ticketAi.status())),
};
