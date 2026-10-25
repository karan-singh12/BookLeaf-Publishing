import { MESSAGES } from '../constants/messages';
import type { DraftPayload } from '../services/ticket-ai-workflow.service';

/** The headline message for a draft response: template fallback, saved draft, or freshly generated. */
export const describeDraft = (draft: Pick<DraftPayload, 'source' | 'cached'>): string => {
  if (draft.source === 'template') return MESSAGES.ticket.draftFallback;
  return draft.cached ? MESSAGES.ticket.draftCached : MESSAGES.ticket.draftReady;
};
