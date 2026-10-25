import { MESSAGES } from '../constants/messages';
import { CreateTicketInput, ListTicketsInput, UpdateTicketInput, ticketService } from '../services/ticket.service';
import { created, ok } from '../utils/response';
import { handle, None } from './handler';

export type TicketParams = { ticketId: string };

/** Ticket lifecycle: create, browse, inspect, triage. Conversation and AI drafts have their own controllers. */
export const ticketController = {
  create: handle<None, None, CreateTicketInput>(async ({ auth, body }, res) => {
    const ticket = await ticketService.create(auth, body);
    return created(res, MESSAGES.common.created('Ticket'), ticket);
  }),

  list: handle<None, ListTicketsInput>(async ({ auth, query }, res) => {
    const { items, meta } = await ticketService.list(auth, query);
    return ok(res, MESSAGES.common.fetched('Tickets'), items, meta);
  }),

  stats: handle(async (_context, res) => {
    return ok(res, MESSAGES.common.fetched('Ticket statistics'), await ticketService.stats());
  }),

  get: handle<TicketParams>(async ({ auth, params }, res) => {
    const detail = await ticketService.getDetail(auth, params.ticketId);
    return ok(res, MESSAGES.common.fetched('Ticket'), detail);
  }),

  update: handle<TicketParams, None, UpdateTicketInput>(async ({ auth, params, body }, res) => {
    const ticket = await ticketService.update(auth, params.ticketId, body);
    return ok(res, MESSAGES.common.updated('Ticket'), ticket);
  }),
};
