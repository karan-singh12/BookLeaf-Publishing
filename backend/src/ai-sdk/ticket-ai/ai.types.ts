import { TicketCategory, TicketPriority } from '../../constants/domain';
import type { AiFailureReason, TokenUsage } from '..';

/** Plain, persistence-agnostic snapshot of a book, as the AI layer sees it. */
export interface BookFacts {
  title: string;
  status: string;
  isPublished: boolean;
  publicationDate: Date | null;
  mrp: number | null;
  royaltyPerCopy: number | null;
  copiesSold: number;
  royaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastPayoutDate: Date | null;
  platforms: string[];
  printPartner: string | null;
}

export interface ClassificationInput {
  subject: string;
  description: string;
  book?: { title: string; status: string } | null;
}

export interface ClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  reasoning: string;
  /** `heuristic` means the LLM was unavailable and keyword rules were used instead. */
  source: 'llm' | 'heuristic';
  model?: string;
  usage?: TokenUsage;
  failureReason?: AiFailureReason;
}

export interface DraftInput {
  authorName: string;
  subject: string;
  description: string;
  category: TicketCategory;
  /** The author's latest follow-up, if the conversation has already started. */
  followUp?: string;
  /** File names the author already attached to the ticket (contents are not available to the model). */
  attachmentNames?: string[];
  focusBook: BookFacts | null;
  /** Used for account-level tickets that are not tied to a single book. */
  otherBooks: BookFacts[];
  today: Date;
}

export interface DraftResult {
  text: string;
  /** `template` means the LLM was unavailable and a generic, policy-accurate starting point was used. */
  source: 'llm' | 'template';
  model?: string;
  usage?: TokenUsage;
  failureReason?: AiFailureReason;
}
