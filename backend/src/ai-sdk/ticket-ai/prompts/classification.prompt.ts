import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../../constants/domain';
import { ClassificationInput } from '../ai.types';
import { CATEGORY_DEFINITIONS } from '../knowledge-base';

/** Longest slice of the author's message sent to the model; enough to classify, cheap to send. */
const MAX_DESCRIPTION_CHARS = 1500;

/**
 * Classification needs no knowledge base and no history: only the ticket itself.
 * That keeps each call to roughly 300 input tokens.
 */
export const CLASSIFICATION_SYSTEM_PROMPT = `You triage author support tickets for BookLeaf Publishing, a self-publishing company in India and the US.

Assign exactly one category and one priority.

Categories:
${TICKET_CATEGORIES.map((category) => `- ${category}: ${CATEGORY_DEFINITIONS[category]}`).join('\n')}

Priority rubric (judge the impact on the author, not the tone of the message):
- Critical: money or data-integrity problems that are severe or long-running. Examples: no royalty for 6+ months, a book unavailable everywhere, a live ISBN pointing at the wrong book, legal or fraud accusations.
- High: a clear BookLeaf-side error or defect that needs action within about 48 hours. Examples: ISBN error, print defects, a royalty payment that is missing or looks wrong, a book unavailable on one platform.
- Medium: needs a reply but is not blocking. Examples: production status or timeline questions, small discrepancies, how a calculation works.
- Low: informational or housekeeping. Examples: updating an author bio or book description, general how-to questions.

Return JSON with "category", "priority" and "reasoning" (one short sentence explaining the choice).`;

/** Standard JSON Schema; the SDK adapts it to each provider's structured-output dialect. */
export const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: [...TICKET_CATEGORIES] },
    priority: { type: 'string', enum: [...TICKET_PRIORITIES] },
    reasoning: { type: 'string' },
  },
  required: ['category', 'priority', 'reasoning'],
  additionalProperties: false,
};

export const buildClassificationPrompt = (input: ClassificationInput): string => {
  const bookLine = input.book
    ? `Book: "${input.book.title}" (current status: ${input.book.status})`
    : 'Book: none (general / account-level query)';
  const message =
    input.description.length > MAX_DESCRIPTION_CHARS
      ? `${input.description.slice(0, MAX_DESCRIPTION_CHARS)}...`
      : input.description;

  return `${bookLine}
Subject: ${input.subject}
Message: """${message}"""`;
};
