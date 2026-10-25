import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { ticketService } from "@/services/ticket.service";
import type { AdminTicket, CreateTicketInput, Ticket, TicketFilters, UpdateTicketInput } from "@/types/domain";
import { useFallbackPolling } from "./use-live-status";

/** Author's own tickets (the API scopes by the signed-in user). */
export const useMyTickets = (filters: TicketFilters = {}) => {
  const refetchInterval = useFallbackPolling();
  return useQuery({
    queryKey: queryKeys.ticketList(filters),
    queryFn: () => ticketService.list<Ticket>(filters),
    placeholderData: keepPreviousData,
    refetchInterval,
  });
};

/** The admin queue. Keeps the previous page on screen while filters or pages change. */
export const useQueue = (filters: TicketFilters) => {
  const refetchInterval = useFallbackPolling();
  return useQuery({
    queryKey: queryKeys.ticketList(filters),
    queryFn: () => ticketService.list<AdminTicket>(filters),
    placeholderData: keepPreviousData,
    refetchInterval,
  });
};

export const useTicketStats = () => {
  const refetchInterval = useFallbackPolling();
  return useQuery({ queryKey: queryKeys.ticketStats, queryFn: ticketService.stats, refetchInterval });
};

export const useTicketDetail = <T extends Ticket = Ticket>(ticketId: string) => {
  const refetchInterval = useFallbackPolling();
  return useQuery({
    queryKey: queryKeys.ticketDetail(ticketId),
    queryFn: () => ticketService.get<T>(ticketId),
    refetchInterval,
  });
};

/** AI draft for a ticket: loaded once when the admin opens it; "regenerate" is an explicit action. */
export const useTicketDraft = (ticketId: string) =>
  useQuery({
    queryKey: queryKeys.draft(ticketId),
    queryFn: () => ticketService.draft(ticketId),
    staleTime: Infinity, // never refetch behind the admin's back: they may be editing it
    refetchOnWindowFocus: false,
    retry: false,
  });

/** Mutations share one rule: after any change, everything under ["tickets"] is refreshed. */
const useTicketMutation = <TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tickets, refetchType: "active" }),
  });
};

export const useCreateTicket = () => useTicketMutation((input: CreateTicketInput) => ticketService.create(input));

export const useUpdateTicket = (ticketId: string) =>
  useTicketMutation((input: UpdateTicketInput) => ticketService.update(ticketId, input));

export const useSendMessage = (ticketId: string) =>
  useTicketMutation(({ body, fromAiDraft }: { body: string; fromAiDraft?: boolean }) =>
    ticketService.addMessage(ticketId, body, fromAiDraft),
  );

export const useAddNote = (ticketId: string) => useTicketMutation((body: string) => ticketService.addNote(ticketId, body));

export const useRegenerateDraft = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ticketService.draft(ticketId, true),
    onSuccess: (draft) => queryClient.setQueryData(queryKeys.draft(ticketId), draft),
  });
};
