import { createAiClient } from '..';
import { env } from '../../config/env';
import { TicketAiService } from './ticket-ai.service';

/** The application's AI client, configured entirely from environment variables. */
export const aiClient = createAiClient(env.ai);

/** BookLeaf's AI features (triage and draft replies) on top of the SDK. */
export const ticketAi = new TicketAiService(aiClient);

export { TicketAiService } from './ticket-ai.service';
export type { BookFacts, ClassificationResult, DraftResult } from './ai.types';
export { heuristicClassify } from './heuristic-classifier';
export { DRAFT_PROMPT_VERSION } from './prompts/draft.prompt';
