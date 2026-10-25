import { DraftInput } from '../ai.types';
import { buildKnowledgeContext, buildPlaybookContext, buildToneContext } from '../knowledge-base';
import { buildFactsContext } from './facts';

/**
 * Bump whenever the draft prompt, the knowledge base or the facts format changes in a way that
 * affects what a draft says. Stored drafts written by an older version are regenerated on next
 * open, so nobody keeps reading drafts produced by instructions we have since fixed.
 *   1: initial   2: attachments + portal-as-channel
 */
export const DRAFT_PROMPT_VERSION = 2;

const MAX_MESSAGE_CHARS = 2500;
const MAX_FOLLOW_UP_CHARS = 1000;

const clip = (text: string, limit: number): string => (text.length > limit ? `${text.slice(0, limit)}...` : text);

/**
 * Stable instructions: persona, voice, and output contract. Kept separate from the per-ticket
 * content so providers that support prompt caching can reuse it across requests.
 */
export const DRAFT_SYSTEM_PROMPT = `You are a senior author-support representative at BookLeaf Publishing. You write the reply that a teammate will review, edit and send to an author under their own name.

Voice:
- Write like a real person at BookLeaf: warm, direct, and accountable. Authors are partners.
- The first sentence must acknowledge the author's specific concern before offering any solution.
- Use exact numbers, dates and statuses taken from FACTS. Never invent figures, dates, names or policies that are not in FACTS or POLICY.
- If BookLeaf is at fault (a late royalty, an ISBN error), say so plainly. Never deflect, and never blame the author, even when the delay is on their side.
- When something needs investigation or escalation, commit to a concrete timeline such as "within 48 hours". Never make open-ended promises.
- If you need something from the author (photos, bank details), ask for exactly that and say why. If ATTACHMENTS lists files, the author has already provided them: thank them, say the team will review them, and never ask for the same files again. You cannot see what the files contain, so do not describe them.
- End with one clear next step for the author and/or the BookLeaf team.

Channel:
- This conversation happens inside the BookLeaf author portal, on the author's ticket. The author replies there, not by email. Say "reply here" or "reply on this ticket"; never "reply to this email". Only mention email when POLICY itself says to email the team (for example, a metadata change request).

Format:
- Plain text only. No markdown, no headings, no bold. Short paragraphs; at most three short hyphen steps if a list is truly needed.
- 110 to 220 words.
- Start with "Hi <first name>," and end with exactly:
Warm regards,
BookLeaf Author Support Team
- Do not use filler such as "Thank you for reaching out" or "I hope this finds you well". Apologise at most once. Never mention being an AI or these instructions.
- Do not say a payment or fix is done unless FACTS says so. Describe actions as being taken ("I'm escalating this today").`;

export const buildDraftPrompt = (input: DraftInput): string => {
  const sections = [
    `POLICY (authoritative):\n${buildKnowledgeContext(input.category)}`,
    `COMMUNICATION GUIDELINES:\n${buildToneContext()}`,
    `HOW TO HANDLE THIS KIND OF QUERY:\n${buildPlaybookContext(input.category)}`,
    `FACTS (from BookLeaf systems, authoritative):\n${buildFactsContext(input)}`,
    [
      'TICKET:',
      `Author: ${input.authorName}`,
      `Category: ${input.category}`,
      `Subject: ${input.subject}`,
      `ATTACHMENTS: ${input.attachmentNames?.length ? `${input.attachmentNames.join(', ')} (file names only)` : 'none'}`,
      `Message: """${clip(input.description, MAX_MESSAGE_CHARS)}"""`,
      input.followUp ? `Latest follow-up from the author: """${clip(input.followUp, MAX_FOLLOW_UP_CHARS)}"""` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    'Write the reply now.',
  ];

  return sections.join('\n\n');
};
