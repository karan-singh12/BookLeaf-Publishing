import type { TicketFilters } from "@/types/domain";

/**
 * Every cache key in one place. Everything about tickets lives under ["tickets"], so a single
 * invalidation (on a live event or after a mutation) refreshes lists, details and stats together.
 */
export const queryKeys = {
  books: ["books"] as const,
  book: (id: string) => ["books", id] as const,
  tickets: ["tickets"] as const,
  ticketList: (filters: TicketFilters) => ["tickets", "list", filters] as const,
  ticketDetail: (id: string) => ["tickets", "detail", id] as const,
  ticketStats: ["tickets", "stats"] as const,
  draft: (id: string) => ["tickets", "draft", id] as const,
};
