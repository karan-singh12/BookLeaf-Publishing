import { describeDraft } from '../presenters/draft.presenter';
import { ticketAiWorkflow } from '../services/ticket-ai-workflow.service';
import { ok } from '../utils/response';
import { handle, None } from './handler';
import type { TicketParams } from './ticket.controller';

/** AI assistance on a single ticket. */
export const ticketAiController = {
  getDraft: handle<TicketParams, None, { refresh: boolean }>(async ({ params, body }, res) => {
    const draft = await ticketAiWorkflow.getDraft(params.ticketId, body.refresh);
    return ok(res, describeDraft(draft), draft);
  }),
};
