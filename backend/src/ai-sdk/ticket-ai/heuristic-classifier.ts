import { TicketCategory, TicketPriority } from '../../constants/domain';
import { ClassificationInput } from './ai.types';

/**
 * Keyword-based classifier used when the LLM is unavailable (and to give every new ticket a
 * sensible category/priority instantly, before the LLM answers). It is intentionally simple:
 * a safety net, not a replacement for the model.
 */

// Order matters: on a tie, earlier entries win (more specific / more urgent categories first).
const CATEGORY_PATTERNS: Array<[TicketCategory, RegExp[]]> = [
  ['ISBN & Metadata Issues', [/\bisbn\b/i, /barcode/i, /wrong (book|title|cover)/i, /different (title|cover|isbn)/i, /metadata (error|issue|wrong)/i]],
  ['Printing & Quality', [/\bprint(ed|ing)?\b/i, /misprint/i, /binding/i, /blurry/i, /misaligned/i, /colou?r/i, /defect/i, /damaged/i, /reprint/i, /author copies/i, /quality/i]],
  ['Royalty & Payments', [/royalt/i, /payout/i, /\bpaid\b/i, /payment/i, /bank (account|details|transfer)/i, /earning/i, /per copy/i, /net profit/i, /\bcommission\b/i]],
  ['Distribution & Availability', [/unavailable/i, /out of stock/i, /not (showing|listed|available)/i, /amazon/i, /flipkart/i, /\blisting\b/i, /re-?sync/i, /distribution/i]],
  ['Book Status & Production Updates', [/typesetting/i, /proofread/i, /cover design/i, /\bediting\b/i, /production/i, /when will/i, /\bdelay/i, /\bstuck\b/i, /\bstatus\b/i, /go live/i, /manuscript/i]],
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const classifyCategory = (text: string): TicketCategory => {
  let best: TicketCategory = 'General Inquiry';
  let bestScore = 0;
  for (const [category, patterns] of CATEGORY_PATTERNS) {
    const score = patterns.filter((pattern) => pattern.test(text)).length;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
};

/** Returns the longest "N months/years" duration mentioned, in months. */
const mentionedMonths = (text: string): number => {
  let longest = 0;
  for (const match of text.matchAll(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*\+?\s*(month|year)s?/gi)) {
    const amount = NUMBER_WORDS[match[1].toLowerCase()] ?? Number(match[1]);
    longest = Math.max(longest, match[2].toLowerCase() === 'year' ? amount * 12 : amount);
  }
  return longest;
};

const classifyPriority = (category: TicketCategory, text: string): TicketPriority => {
  const legalOrFraud = /legal|lawyer|consumer court|fraud|scam|cheat/i.test(text);
  const urgentTone = /urgent|immediately|unacceptable|escalate|public(ly)?|social media|refund/i.test(text);
  const problem = /not (received|paid|showing|available|listed)|haven'?t (received|been paid)|no royalt|still (waiting|not)|wrong|duplicate|mismatch|incorrect|terrible|blurry|misaligned|defect|unavailable/i.test(text);

  if (legalOrFraud) return 'Critical';

  switch (category) {
    case 'Royalty & Payments':
      if (problem && mentionedMonths(text) >= 6) return 'Critical';
      if (problem || urgentTone) return 'High';
      return 'Medium';
    case 'ISBN & Metadata Issues':
      return 'High'; // ISBN errors are high priority by BookLeaf policy
    case 'Printing & Quality':
      return problem || urgentTone ? 'High' : 'Medium';
    case 'Distribution & Availability':
      return problem ? 'High' : 'Medium';
    case 'Book Status & Production Updates':
      return urgentTone ? 'High' : 'Medium';
    default:
      return urgentTone ? 'Medium' : 'Low';
  }
};

export const heuristicClassify = (input: ClassificationInput) => {
  const text = `${input.subject}\n${input.description}`;
  const category = classifyCategory(text);
  const priority = classifyPriority(category, text);
  return {
    category,
    priority,
    reasoning: 'Classified by keyword rules (AI model unavailable).',
  };
};
