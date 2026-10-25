import { api } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  AdminTicket,
  CreateTicketInput,
  Draft,
  Message,
  Ticket,
  TicketDetail,
  TicketFilters,
  TicketStats,
  UpdateTicketInput,
} from "@/types/domain";

/** One method per endpoint. The role decides the response shape (`Ticket` vs `AdminTicket`). */
export const ticketService = {
  async list<T extends Ticket = Ticket>(filters: TicketFilters = {}): Promise<Paged<T>> {
    const { data, meta } = await api.get<T[]>("/tickets", { ...filters });
    return { items: data, meta: meta! };
  },

  async get<T extends Ticket = Ticket>(ticketId: string) {
    return (await api.get<TicketDetail<T>>(`/tickets/${ticketId}`)).data;
  },

  async create(input: CreateTicketInput) {
    return (await api.post<Ticket>("/tickets", input)).data;
  },

  async update(ticketId: string, input: UpdateTicketInput) {
    return (await api.patch<AdminTicket>(`/tickets/${ticketId}`, input)).data;
  },

  async addMessage(ticketId: string, body: string, fromAiDraft = false) {
    return (await api.post<Message>(`/tickets/${ticketId}/messages`, { body, fromAiDraft })).data;
  },

  async addNote(ticketId: string, body: string) {
    return (await api.post<Message>(`/tickets/${ticketId}/notes`, { body })).data;
  },

  async stats() {
    return (await api.get<TicketStats>("/tickets/stats")).data;
  },

  async draft(ticketId: string, refresh = false) {
    return (await api.post<Draft>(`/tickets/${ticketId}/draft`, { refresh })).data;
  },
};
