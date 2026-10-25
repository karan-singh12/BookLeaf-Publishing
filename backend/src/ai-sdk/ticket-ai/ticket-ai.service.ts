import { AiError, type AiClient } from '..';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TicketCategory, TicketPriority } from '../../constants/domain';
import { ClassificationInput, ClassificationResult, DraftInput, DraftResult } from './ai.types';
import { buildTemplateDraft } from './fallback-draft';
import { heuristicClassify } from './heuristic-classifier';
import {
  CLASSIFICATION_SCHEMA,
  CLASSIFICATION_SYSTEM_PROMPT,
  buildClassificationPrompt,
} from './prompts/classification.prompt';
import { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from './prompts/draft.prompt';

const SIGN_OFF_MARKER = 'BookLeaf Author Support Team';

/** Routing task names; each can be pointed at different models via AI_ROUTE_<TASK>. */
const TASKS = { classify: 'classify', draft: 'draft' } as const;

/** Low temperature for triage (consistency matters), a little warmth for prose. */
const CLASSIFY_OPTIONS = { temperature: 0.1, maxOutputTokens: 160, retries: 2 } as const;
const DRAFT_OPTIONS = { temperature: 0.5, maxOutputTokens: 600, retries: 1 } as const;

const asEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | null => {
  if (typeof value !== 'string') return null;
  return allowed.find((candidate) => candidate.toLowerCase() === value.trim().toLowerCase()) ?? null;
};

const failureReasonOf = (error: unknown) => (error instanceof AiError ? error.reason : 'upstream_error');

/** Validates the classifier's JSON. Throwing here makes the SDK try the next model in the chain. */
const parseClassification = (raw: string): { category: TicketCategory; priority: TicketPriority; reasoning: string } => {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('not valid JSON');
  }

  const category = asEnum(data.category, TICKET_CATEGORIES);
  const priority = asEnum(data.priority, TICKET_PRIORITIES);
  if (!category || !priority) throw new Error('unknown category or priority');

  const reasoning = typeof data.reasoning === 'string' ? data.reasoning.trim().slice(0, 300) : '';
  return { category, priority, reasoning };
};

/** Replies happen on the ticket in the portal, so "reply to this email" is always wrong. */
const fixChannel = (text: string): string => text.replace(/reply to this (?:e-?mail|message)/gi, 'reply on this ticket');

/** Strips stray markdown/fences, corrects the reply channel, and guarantees the standard sign-off. */
const cleanDraft = (raw: string): string => {
  const text = fixChannel(
    raw
      .replace(/^```[a-z]*\n?|```$/gim, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .trim(),
  );
  return text.includes(SIGN_OFF_MARKER) ? text : `${text}\n\nWarm regards,\n${SIGN_OFF_MARKER}`;
};

/**
 * BookLeaf's AI features. It owns the prompts, the output validation and the degradation policy;
 * model choice, retries, fallback between providers and circuit breaking belong to the SDK.
 * Every public method resolves with a usable result: if no model can serve the request it falls
 * back to keyword rules (classification) or a template (drafts), so the AI being down never
 * blocks ticket creation or an admin's reply.
 */
export class TicketAiService {
  constructor(private readonly ai: Pick<AiClient, 'generate' | 'isConfigured' | 'status'>) {}

  get isConfigured(): boolean {
    return this.ai.isConfigured();
  }

  /** Providers, routes, breaker state and usage counters, for the admin status endpoint. */
  status() {
    return this.ai.status();
  }

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    try {
      const result = await this.ai.generate({
        task: TASKS.classify,
        system: CLASSIFICATION_SYSTEM_PROMPT,
        prompt: buildClassificationPrompt(input),
        jsonSchema: CLASSIFICATION_SCHEMA,
        parse: parseClassification,
        ...CLASSIFY_OPTIONS,
      });
      return { ...result.value, source: 'llm', model: `${result.provider}:${result.model}`, usage: result.usage };
    } catch (error) {
      const reason = failureReasonOf(error);
      console.warn(`[ai] classification fell back to keyword rules (${reason}): ${(error as Error).message}`);
      return { ...heuristicClassify(input), source: 'heuristic', failureReason: reason };
    }
  }

  async draft(input: DraftInput): Promise<DraftResult> {
    try {
      const result = await this.ai.generate({
        task: TASKS.draft,
        system: DRAFT_SYSTEM_PROMPT,
        prompt: buildDraftPrompt(input),
        parse: cleanDraft,
        ...DRAFT_OPTIONS,
      });
      return { text: result.value, source: 'llm', model: `${result.provider}:${result.model}`, usage: result.usage };
    } catch (error) {
      const reason = failureReasonOf(error);
      console.warn(`[ai] draft fell back to template (${reason}): ${(error as Error).message}`);
      return {
        text: buildTemplateDraft(input.category, input.authorName.split(' ')[0] || 'there', input.attachmentNames),
        source: 'template',
        failureReason: reason,
      };
    }
  }
}
