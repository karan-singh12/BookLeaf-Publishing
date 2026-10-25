import { heuristicClassify } from '../ai-sdk/ticket-ai';
import { TicketCategory, TicketPriority, TicketStatus } from '../constants/domain';
import { Ticket, TicketMessage, User, nextSequence } from '../models';
import {
  asTicketView,
  presentMessage,
  presentTicketForAdmin,
  presentTicketForAuthor,
  MessageView,
} from '../presenters/ticket.presenter';
import { bookRepository } from '../repositories/book.repository';
import { TicketSort, buildTicketFilter, ticketRepository } from '../repositories/ticket.repository';
import { eventHub, TicketEvent } from '../realtime/event-hub';
import type { AuthContext } from '../types/express';
import { MESSAGES } from '../constants/messages';
import { AppError } from '../utils/errors';
import { buildPageMeta } from '../utils/response';
import { ticketAiWorkflow } from './ticket-ai-workflow.service';

/** Ticket numbers are shown as #1001, #1002, ... which reads better than #1. */
const TICKET_NUMBER_BASE = 1000;

export interface CreateTicketInput {
  bookId?: string | null;
  subject: string;
  description: string;
  attachments: Array<{ fileName: string; sizeBytes: number }>;
}

export interface ListTicketsInput {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignee?: 'me' | 'unassigned';
  q?: string;
  from?: Date;
  to?: Date;
  sort?: TicketSort;
  page: number;
  limit: number;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignee?: 'me' | null;
}

const isAdmin = (auth: AuthContext): boolean => auth.role === 'admin';

const notify = (type: TicketEvent['type'], ticketId: string, authorId: string, adminOnly = false): void =>
  eventHub.publish({ type, ticketId, authorId, adminOnly });

/** Loads a ticket the caller may act on. Authors get 404 (not 403) for other authors' tickets. */
const loadAccessibleTicket = async (auth: AuthContext, ticketId: string) => {
  const ticket = await ticketRepository.findOneScoped(ticketId, isAdmin(auth) ? undefined : auth.userId);
  if (!ticket) throw AppError.notFound('Ticket');
  return ticket;
};

const presentFor = async (auth: AuthContext, ticketId: string) => {
  const ticket = await ticketRepository.findByIdPopulated(ticketId, isAdmin(auth) ? undefined : auth.userId);
  if (!ticket) throw AppError.notFound('Ticket');
  const view = asTicketView(ticket);
  const summaries = await ticketRepository.replySummaries([ticket._id]);
  const summary = summaries.get(String(ticket._id));
  return isAdmin(auth) ? presentTicketForAdmin(view, summary) : presentTicketForAuthor(view, summary);
};

/**
 * Whether an admin's explicit choice counts as an override of the AI. If the AI has not finished
 * yet, any explicit choice is protected from being replaced by the AI's later answer.
 */
const isOverride = (aiStatus: string | undefined, aiValue: string | undefined, chosen: string): boolean =>
  aiStatus !== 'completed' || aiValue !== chosen;

export const ticketService = {
  async create(auth: AuthContext, input: CreateTicketInput) {
    let bookId: string | null = null;
    if (input.bookId) {
      const book = await bookRepository.findOne({ _id: input.bookId, author: auth.userId });
      if (!book) throw AppError.notFound('Book');
      bookId = String(book._id);
    }

    // Instant keyword-based triage so the ticket is usable immediately, even if the AI is down.
    const triage = heuristicClassify(input);
    const number = TICKET_NUMBER_BASE + (await nextSequence('ticket'));

    const ticket = await Ticket.create({
      number,
      author: auth.userId,
      book: bookId,
      subject: input.subject,
      description: input.description,
      attachments: input.attachments,
      category: triage.category,
      priority: triage.priority,
      ai: { status: 'pending', source: 'heuristic', category: triage.category, priority: triage.priority, reasoning: triage.reasoning },
    });

    const ticketId = String(ticket._id);
    notify('ticket.created', ticketId, auth.userId);
    // Fire and forget: the author's request never waits on the LLM.
    void ticketAiWorkflow.classifyInBackground(ticketId);

    return presentFor(auth, ticketId);
  },

  async list(auth: AuthContext, query: ListTicketsInput) {
    const admin = isAdmin(auth);
    const filter = buildTicketFilter(
      {
        status: query.status,
        category: query.category,
        q: query.q,
        from: query.from,
        to: query.to,
        // Priority and assignment are internal triage data; authors cannot filter on them.
        priority: admin ? query.priority : undefined,
        assigneeId: admin ? (query.assignee === 'me' ? auth.userId : query.assignee) : undefined,
      },
      admin ? undefined : auth.userId,
    );

    const sort = query.sort ?? (admin ? 'urgency' : 'activity');
    const { items, total } = await ticketRepository.list(filter, sort, query.page, query.limit);
    const summaries = await ticketRepository.replySummaries(items.map((item) => item._id));

    const present = admin ? presentTicketForAdmin : presentTicketForAuthor;
    return {
      items: items.map((item) => present(asTicketView(item), summaries.get(String(item._id)))),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async getDetail(auth: AuthContext, ticketId: string) {
    const admin = isAdmin(auth);
    const ticket = await presentFor(auth, ticketId);
    const all = (await ticketRepository.listMessages(ticketId, admin)) as unknown as MessageView[];

    return {
      ticket,
      messages: all.filter((message) => message.visibility === 'public').map(presentMessage),
      // Internal notes are only ever loaded for admins (see ticketRepository.listMessages).
      notes: all.filter((message) => message.visibility === 'internal').map(presentMessage),
    };
  },

  async update(auth: AuthContext, ticketId: string, patch: UpdateTicketInput) {
    const ticket = await loadAccessibleTicket(auth, ticketId);

    if (patch.category && patch.category !== ticket.category) {
      ticket.categoryOverridden = isOverride(ticket.ai?.status, ticket.ai?.category ?? undefined, patch.category);
      ticket.category = patch.category;
      ticket.draft = null; // the stored draft was written for the old category
    }
    if (patch.priority && patch.priority !== ticket.priority) {
      ticket.priorityOverridden = isOverride(ticket.ai?.status, ticket.ai?.priority ?? undefined, patch.priority);
      ticket.priority = patch.priority;
    }
    if (patch.status && patch.status !== ticket.status) {
      ticket.status = patch.status;
      const finished = patch.status === 'Resolved' || patch.status === 'Closed';
      ticket.resolvedAt = finished ? (ticket.resolvedAt ?? new Date()) : null;
    }
    if (patch.assignee !== undefined) {
      ticket.assignee = patch.assignee === 'me' ? (auth.userId as unknown as typeof ticket.assignee) : null;
    }

    ticket.lastActivityAt = new Date();
    await ticket.save();

    notify('ticket.updated', ticketId, String(ticket.author));
    return presentFor(auth, ticketId);
  },

  async addMessage(auth: AuthContext, ticketId: string, input: { body: string; fromAiDraft: boolean }) {
    const ticket = await loadAccessibleTicket(auth, ticketId);
    if (ticket.status === 'Closed') {
      throw AppError.conflict(MESSAGES.ticket.closed);
    }

    const sender = await User.findById(auth.userId).select('name');
    if (!sender) throw AppError.unauthenticated();

    const message = await TicketMessage.create({
      ticket: ticket._id,
      sender: sender._id,
      senderName: sender.name,
      senderRole: auth.role,
      visibility: 'public',
      body: input.body,
      fromAiDraft: isAdmin(auth) && input.fromAiDraft,
      // Edited = the sent text differs from the stored AI draft the admin started from.
      draftEdited: isAdmin(auth) && input.fromAiDraft && ticket.draft?.text.trim() !== input.body,
    });

    if (isAdmin(auth)) {
      ticket.firstResponseAt ??= message.createdAt;
      if (ticket.status === 'Open') ticket.status = 'In Progress';
      // Replying means taking ownership, unless someone already has it.
      ticket.assignee ??= sender._id as unknown as typeof ticket.assignee;
    } else {
      // A follow-up reopens a resolved ticket and makes any stored draft stale.
      if (ticket.status === 'Resolved') {
        ticket.status = 'Open';
        ticket.resolvedAt = null;
      }
      ticket.draft = null;
    }

    ticket.lastActivityAt = message.createdAt;
    await ticket.save();

    notify('ticket.message', ticketId, String(ticket.author));
    return presentMessage(message.toObject() as unknown as MessageView);
  },

  async addNote(auth: AuthContext, ticketId: string, input: { body: string }) {
    const ticket = await loadAccessibleTicket(auth, ticketId);
    const sender = await User.findById(auth.userId).select('name');
    if (!sender) throw AppError.unauthenticated();

    const note = await TicketMessage.create({
      ticket: ticket._id,
      sender: sender._id,
      senderName: sender.name,
      senderRole: 'admin',
      visibility: 'internal',
      body: input.body,
    });

    notify('ticket.updated', ticketId, String(ticket.author), true);
    return presentMessage(note.toObject() as unknown as MessageView);
  },

  stats: () => ticketRepository.stats(),
};
