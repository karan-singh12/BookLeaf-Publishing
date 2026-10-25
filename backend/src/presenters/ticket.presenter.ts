import { TicketAttrs, TicketMessageAttrs } from '../models';

interface PersonRef {
  _id: unknown;
  name?: string;
  email?: string;
  authorCode?: string;
}

interface BookRef {
  _id: unknown;
  title?: string;
  status?: string;
  isbn?: string;
}

/** A ticket as loaded by the repository: lean, with author/book/assignee populated. */
export type TicketView = Omit<TicketAttrs, 'author' | 'book' | 'assignee'> & {
  _id: unknown;
  author: PersonRef;
  book: BookRef | null;
  assignee: PersonRef | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageView = TicketMessageAttrs & { _id: unknown; createdAt: Date };

export interface ReplySummary {
  count: number;
  latestBody: string;
  latestAt: Date;
}

/** Repository results are structurally a `TicketView`; Mongoose's populate typing just can't express it. */
export const asTicketView = (value: unknown): TicketView => value as TicketView;

const person = (ref: PersonRef | null) => (ref ? { id: String(ref._id), name: ref.name ?? '', email: ref.email ?? '' } : null);

const book = (ref: BookRef | null) =>
  ref ? { id: String(ref._id), title: ref.title ?? '', status: ref.status ?? '', isbn: ref.isbn ?? '' } : null;

const reply = (summary?: ReplySummary) => ({
  replyCount: summary?.count ?? 0,
  latestReply: summary ? { body: summary.latestBody, createdAt: summary.latestAt } : null,
});

const common = (ticket: TicketView, summary?: ReplySummary) => ({
  id: String(ticket._id),
  number: ticket.number,
  subject: ticket.subject,
  description: ticket.description,
  attachments: ticket.attachments,
  status: ticket.status,
  category: ticket.category,
  book: book(ticket.book),
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  lastActivityAt: ticket.lastActivityAt,
  ...reply(summary),
});

/**
 * Author-facing ticket. Deliberately omits priority, AI output, assignment and anything else
 * that is internal to the support team.
 */
export const presentTicketForAuthor = (ticket: TicketView, summary?: ReplySummary) => common(ticket, summary);

/** Admin-facing ticket: the author view plus triage, AI and assignment metadata. */
export const presentTicketForAdmin = (ticket: TicketView, summary?: ReplySummary) => ({
  ...common(ticket, summary),
  author: { ...person(ticket.author), authorCode: ticket.author.authorCode ?? null },
  priority: ticket.priority,
  categoryOverridden: ticket.categoryOverridden,
  priorityOverridden: ticket.priorityOverridden,
  assignee: person(ticket.assignee),
  firstResponseAt: ticket.firstResponseAt,
  resolvedAt: ticket.resolvedAt,
  ai: {
    status: ticket.ai?.status ?? 'pending',
    source: ticket.ai?.source ?? 'heuristic',
    category: ticket.ai?.category ?? null,
    priority: ticket.ai?.priority ?? null,
    reasoning: ticket.ai?.reasoning ?? null,
    model: ticket.ai?.model ?? null,
  },
});

export const presentMessage = (message: MessageView) => ({
  id: String(message._id),
  senderName: message.senderName,
  senderRole: message.senderRole,
  visibility: message.visibility,
  body: message.body,
  fromAiDraft: message.fromAiDraft,
  draftEdited: message.draftEdited,
  createdAt: message.createdAt,
});
