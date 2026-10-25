/** Domain types, mirroring the API's DTOs (backend/src/presenters). */

export type Role = 'author' | 'admin';

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** Most to least urgent. */
export const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  authorCode: string | null;
  phone: string | null;
  city: string | null;
}

export interface Book {
  id: string;
  bookCode: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: string;
  isPublished: boolean;
  mrp: number | null;
  royaltyPerCopy: number | null;
  copiesSold: number;
  royaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastPayoutDate: string | null;
  printPartner: string | null;
  platforms: string[];
}

export interface Attachment {
  fileName: string;
  sizeBytes: number;
}

export interface BookRef {
  id: string;
  title: string;
  status: string;
  isbn: string;
}

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface LatestReply {
  body: string;
  createdAt: string;
}

/** The ticket as an author sees it: no priority, AI output or assignment. */
export interface Ticket {
  id: string;
  number: number;
  subject: string;
  description: string;
  attachments: Attachment[];
  status: TicketStatus;
  category: TicketCategory;
  book: BookRef | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  replyCount: number;
  latestReply: LatestReply | null;
}

export interface AiClassification {
  status: 'pending' | 'completed' | 'failed';
  source: 'llm' | 'heuristic';
  category: TicketCategory | null;
  priority: TicketPriority | null;
  reasoning: string | null;
  model: string | null;
}

/** The ticket as an admin sees it: the author view plus triage, AI and assignment data. */
export interface AdminTicket extends Ticket {
  author: PersonRef & { authorCode: string | null };
  priority: TicketPriority;
  categoryOverridden: boolean;
  priorityOverridden: boolean;
  assignee: PersonRef | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  ai: AiClassification;
}

export interface Message {
  id: string;
  senderName: string;
  senderRole: Role;
  visibility: 'public' | 'internal';
  body: string;
  fromAiDraft: boolean;
  draftEdited: boolean;
  createdAt: string;
}

export interface TicketDetail<T extends Ticket = Ticket> {
  ticket: T;
  messages: Message[];
  /** Internal notes. Always empty for authors. */
  notes: Message[];
}

export interface Draft {
  text: string;
  source: 'llm' | 'template';
  model: string | null;
  generatedAt: string;
  cached: boolean;
  /** Why the draft is a template instead of AI output. */
  notice: string | null;
}

export interface TicketStats {
  total: number;
  active: number;
  unassignedActive: number;
  oldestActiveAt: string | null;
  byStatus: Partial<Record<TicketStatus, number>>;
  activeByPriority: Record<TicketPriority, number>;
  activeByCategory: Partial<Record<TicketCategory, number>>;
}

export type TicketSort = 'urgency' | 'newest' | 'oldest' | 'activity';

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignee?: 'me' | 'unassigned';
  q?: string;
  from?: string;
  to?: string;
  sort?: TicketSort;
  page?: number;
  limit?: number;
}

/** The admin queue's user-editable filters (everything except paging). */
export type QueueFilterValues = Pick<TicketFilters, "status" | "category" | "priority" | "assignee" | "q" | "from" | "to" | "sort">;

export interface CreateTicketInput {
  bookId: string | null;
  subject: string;
  description: string;
  attachments: Attachment[];
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignee?: 'me' | null;
}
