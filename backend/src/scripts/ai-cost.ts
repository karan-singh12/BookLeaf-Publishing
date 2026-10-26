import { CLASSIFICATION_SCHEMA, CLASSIFICATION_SYSTEM_PROMPT, buildClassificationPrompt } from '../ai-sdk/ticket-ai/prompts/classification.prompt';
import { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from '../ai-sdk/ticket-ai/prompts/draft.prompt';
import { buildKnowledgeContext, buildPlaybookContext, buildToneContext } from '../ai-sdk/ticket-ai/knowledge-base';
import type { BookFacts } from '../ai-sdk/ticket-ai';
import { TICKET_CATEGORIES, TicketCategory } from '../constants/domain';

/**
 * Prompt-size report (`npm run ai:cost`). It builds the exact prompts the app sends and compares
 * them with a naive design: the whole knowledge base plus the full ticket history on every call.
 * No API calls are made, so it is free and repeatable. Tokens are estimated as characters / 4,
 * which is close for English; the live token counts the providers return are logged per call.
 */

const tokens = (text: string): number => Math.ceil(text.length / 4);

const BOOK: BookFacts = {
  title: 'Whispers of the Ganges',
  status: 'Published & Live',
  isPublished: true,
  publicationDate: new Date('2023-06-20'),
  mrp: 399,
  royaltyPerCopy: 35,
  copiesSold: 342,
  royaltyEarned: 11970,
  royaltyPaid: 8400,
  royaltyPending: 3570,
  lastPayoutDate: new Date('2025-10-15'),
  platforms: ['Amazon India', 'Flipkart', 'BookLeaf Store'],
  printPartner: 'In-House',
};

const TICKET = {
  subject: 'I have not received any royalty for 6 months',
  description:
    'I published my book more than six months ago and I have not received any royalty payment so far. My dashboard shows a pending amount but nothing has reached my bank account. Could you please tell me what is going on and when I can expect the payment?',
};

/** A realistic long thread the naive design would resend on every call (6 messages of ~90 words). */
const HISTORY_MESSAGE =
  'Thank you for the update. I checked my bank details in the dashboard and they are correct, linked to my savings account. I also looked at the royalty breakdown and the sales figures match what I expected for the last two quarters. Please let me know what else you need from my side, because the payment is now overdue and I am planning my expenses around it. I would appreciate a clear date.';
const FULL_HISTORY = Array.from({ length: 6 }, () => HISTORY_MESSAGE).join('\n\n');

/** Every knowledge-base line and playbook, i.e. what you'd send if you did not slice by category. */
const fullKnowledge = (): string => {
  const lines = new Set<string>();
  for (const category of TICKET_CATEGORIES) {
    for (const line of buildKnowledgeContext(category).split('\n')) lines.add(line);
    for (const line of buildPlaybookContext(category).split('\n')) lines.add(line);
  }
  return [...lines].join('\n');
};

const draftPrompt = (category: TicketCategory): string =>
  DRAFT_SYSTEM_PROMPT +
  buildDraftPrompt({
    authorName: 'Priya Sharma',
    ...TICKET,
    category,
    focusBook: BOOK,
    otherBooks: [],
    today: new Date('2026-10-25'),
  });

const classifyPrompt = (): string =>
  CLASSIFICATION_SYSTEM_PROMPT + JSON.stringify(CLASSIFICATION_SCHEMA) + buildClassificationPrompt(TICKET);

const pad = (value: string | number, width: number): string => String(value).padStart(width);

// ---- draft replies
const slicedDrafts = TICKET_CATEGORIES.map((category) => ({ category, size: tokens(draftPrompt(category)) }));
const naiveDraft = tokens(draftPrompt('Royalty & Payments')) - tokens(buildKnowledgeContext('Royalty & Payments')) - tokens(buildPlaybookContext('Royalty & Payments')) + tokens(fullKnowledge()) + tokens(buildToneContext()) * 0 + tokens(FULL_HISTORY);

console.info('Draft reply: input tokens per call (estimated, chars / 4)\n');
console.info(`  ${'Category'.padEnd(36)}${pad('Our prompt', 12)}${pad('Naive', 8)}${pad('Saved', 8)}`);
for (const { category, size } of slicedDrafts) {
  // The naive prompt is the same for every category: all knowledge + the whole history.
  const naive = naiveDraft;
  console.info(`  ${category.padEnd(36)}${pad(size, 12)}${pad(naive, 8)}${pad(`${Math.round((1 - size / naive) * 100)}%`, 8)}`);
}
const avgSliced = Math.round(slicedDrafts.reduce((sum, row) => sum + row.size, 0) / slicedDrafts.length);
console.info(`\n  average: ${avgSliced} tokens vs ${naiveDraft} naive -> ${Math.round((1 - avgSliced / naiveDraft) * 100)}% smaller\n`);

// ---- classification
const classifyOurs = tokens(classifyPrompt());
const classifyNaive = classifyOurs + tokens(fullKnowledge()) + tokens(buildToneContext()) + tokens(FULL_HISTORY);
console.info('Classification: input tokens per call (estimated)\n');
console.info(`  our prompt (ticket only, no knowledge base, no history): ${classifyOurs}`);
console.info(`  naive (full knowledge base + full history):              ${classifyNaive}  -> ${Math.round((1 - classifyOurs / classifyNaive) * 100)}% smaller\n`);

console.info('Per ticket: 1 classification call + 1 draft call. The draft is stored on the ticket, so re-opening it costs nothing;');
console.info('only an explicit "Regenerate" (or a prompt version bump) calls the model again. Output is capped at 160 tokens (classify) and 600 (draft).');
