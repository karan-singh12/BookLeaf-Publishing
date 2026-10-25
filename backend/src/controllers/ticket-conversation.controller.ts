import { MESSAGES } from '../constants/messages';
import { ticketService } from '../services/ticket.service';
import { created } from '../utils/response';
import { handle, None } from './handler';
import type { TicketParams } from './ticket.controller';

/** The thread on a ticket: public messages (both sides) and internal notes (admins only). */
export const ticketConversationController = {
  addMessage: handle<TicketParams, None, { body: string; fromAiDraft: boolean }>(async ({ auth, params, body }, res) => {
    const message = await ticketService.addMessage(auth, params.ticketId, body);
    return created(res, MESSAGES.ticket.messageSent, message);
  }),

  addNote: handle<TicketParams, None, { body: string }>(async ({ auth, params, body }, res) => {
    const note = await ticketService.addNote(auth, params.ticketId, body);
    return created(res, MESSAGES.ticket.noteAdded, note);
  }),
};
