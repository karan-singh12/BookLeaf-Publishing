import { DRAFT_PROMPT_VERSION, ticketAi } from '../ai-sdk/ticket-ai';
import type { AiFailureReason } from '../ai-sdk';
import { Ticket, TicketDocument, deriveSortKeys } from '../models';
import { toBookFacts } from '../presenters/book.presenter';
import { bookRepository } from '../repositories/book.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import { eventHub } from '../realtime/event-hub';
import { AppError } from '../utils/errors';

const MAX_BOOKS_IN_ACCOUNT_CONTEXT = 5;

const NOTICES: Record<AiFailureReason, string> = {
  not_configured: 'AI drafting is not configured on this server. A standard template has been loaded; please personalise it before sending.',
  rate_limited: 'The AI provider is rate-limiting requests right now. A standard template has been loaded; try regenerating in a minute.',
  timeout: 'The AI provider did not respond in time. A standard template has been loaded; you can retry or write your own reply.',
  upstream_error: 'The AI provider is unavailable right now. A standard template has been loaded; you can retry or write your own reply.',
  auth_error: 'The AI provider rejected our credentials. A standard template has been loaded; please tell your administrator.',
  bad_request: 'The AI provider rejected the request. A standard template has been loaded; you can retry or write your own reply.',
  circuit_open: 'The AI provider is temporarily paused after repeated errors. A standard template has been loaded; try again shortly.',
  invalid_output: 'The AI returned an unusable answer. A standard template has been loaded; you can retry or write your own reply.',
};

export interface DraftPayload {
  text: string;
  source: 'llm' | 'template';
  model: string | null;
  generatedAt: Date;
  /** True when served from the stored draft without calling the model. */
  cached: boolean;
  /** Human-readable explanation when the draft is not AI-generated. */
  notice: string | null;
}

/** Concurrent requests for the same ticket (double click, two admins) share one model call. */
const draftsInFlight = new Map<string, Promise<DraftPayload>>();

const buildDraft = async (ticket: TicketDocument): Promise<DraftPayload> => {
  const ticketId = String(ticket._id);
  const [author, focusBook, followUp] = await Promise.all([
    userRepository.findById(String(ticket.author)),
    ticket.book ? bookRepository.findById(String(ticket.book)) : null,
    ticketRepository.latestAuthorMessage(ticketId),
  ]);
  const otherBooks = focusBook
    ? []
    : (await bookRepository.find({ author: ticket.author })).slice(0, MAX_BOOKS_IN_ACCOUNT_CONTEXT);

  const result = await ticketAi.draft({
    authorName: author?.name ?? 'there',
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    followUp: followUp?.body,
    attachmentNames: ticket.attachments.map((file) => file.fileName),
    focusBook: focusBook ? toBookFacts(focusBook) : null,
    otherBooks: otherBooks.map(toBookFacts),
    today: new Date(),
  });

  const generatedAt = new Date();
  if (result.source === 'llm') {
    // Only real model output is stored; a template must not stop the next open from retrying the AI.
    await Ticket.updateOne(
      { _id: ticket._id },
      {
        $set: {
          draft: {
            text: result.text,
            model: result.model,
            category: ticket.category,
            usage: result.usage ?? null,
            promptVersion: DRAFT_PROMPT_VERSION,
            generatedAt,
          },
        },
      },
    );
  }

  return {
    text: result.text,
    source: result.source,
    model: result.model ?? null,
    generatedAt,
    cached: false,
    notice: result.failureReason ? NOTICES[result.failureReason] : null,
  };
};

export const ticketAiWorkflow = {
  /**
   * Upgrades a new ticket's keyword-based triage with the LLM's. Runs after the HTTP response
   * has been sent and never throws: a failure just leaves the keyword-based values in place.
   */
  async classifyInBackground(ticketId: string): Promise<void> {
    try {
      const ticket = await Ticket.findById(ticketId).populate<{ book: { title: string; status: string } | null }>('book', 'title status');
      if (!ticket) return;

      const result = await ticketAi.classify({
        subject: ticket.subject,
        description: ticket.description,
        book: ticket.book ? { title: ticket.book.title, status: ticket.book.status } : null,
      });

      const usedLlm = result.source === 'llm';
      await Ticket.updateOne(
        { _id: ticketId },
        {
          $set: {
            'ai.status': usedLlm ? 'completed' : 'failed',
            'ai.source': result.source,
            'ai.category': result.category,
            'ai.priority': result.priority,
            'ai.reasoning': result.reasoning,
            'ai.model': result.model ?? null,
            'ai.usage': result.usage ?? null,
            'ai.classifiedAt': new Date(),
          },
        },
      );

      if (usedLlm) {
        // Conditional updates are atomic, so an admin override made while the model was
        // thinking is never clobbered by the (later) AI answer.
        await Ticket.updateOne(
          { _id: ticketId, categoryOverridden: false },
          { $set: { category: result.category }, $unset: { draft: '' } },
        );
        await Ticket.updateOne(
          { _id: ticketId, priorityOverridden: false },
          { $set: { priority: result.priority, ...deriveSortKeys(result.priority, ticket.status) } },
        );
      }

      eventHub.publish({ type: 'ticket.updated', ticketId, authorId: String(ticket.author) });
    } catch (error) {
      console.error(`[ai] background classification failed for ticket ${ticketId}`, error);
    }
  },

  /** Returns the stored AI draft, or generates one (or a template when the AI is unavailable). */
  async getDraft(ticketId: string, refresh: boolean): Promise<DraftPayload> {
    const ticket = await ticketRepository.findOneScoped(ticketId);
    if (!ticket) throw AppError.notFound('Ticket');

    // A stored draft is reused only if the current prompt wrote it; older ones are regenerated.
    if (ticket.draft && ticket.draft.promptVersion === DRAFT_PROMPT_VERSION && !refresh) {
      return {
        text: ticket.draft.text,
        source: 'llm',
        model: ticket.draft.model,
        generatedAt: ticket.draft.generatedAt,
        cached: true,
        notice: null,
      };
    }

    const pending = draftsInFlight.get(ticketId);
    if (pending) return pending;

    const generation = buildDraft(ticket).finally(() => draftsInFlight.delete(ticketId));
    draftsInFlight.set(ticketId, generation);
    return generation;
  },
};
