import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type QueueFilterValues, type TicketSort } from "@/types/domain";

/**
 * Filters live in the URL so a reload, the back button or a shared link restores the same view.
 * Everything read back is validated: a hand-edited or outdated URL must never produce a filter
 * the API would reject, so unknown values are simply ignored.
 */

const SORTS: readonly TicketSort[] = ["urgency", "newest", "oldest", "activity"];
const ASSIGNEES = ["me", "unassigned"] as const;
export const DEFAULT_SORT: TicketSort = "urgency";

export const parseEnum = <T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T | undefined => {
  const value = params.get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
};

/** Accepts only a real calendar date written YYYY-MM-DD. */
const parseDate = (params: URLSearchParams, key: string): string | undefined => {
  const value = params.get(key);
  if (!value || value.length !== 10) return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
};

export const parsePage = (params: URLSearchParams): number => {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

export const parseQueueFilters = (params: URLSearchParams): QueueFilterValues => ({
  status: parseEnum(params, "status", TICKET_STATUSES),
  category: parseEnum(params, "category", TICKET_CATEGORIES),
  priority: parseEnum(params, "priority", TICKET_PRIORITIES),
  assignee: parseEnum(params, "assignee", ASSIGNEES),
  q: params.get("q")?.trim().slice(0, 100) || undefined,
  from: parseDate(params, "from"),
  to: parseDate(params, "to"),
  sort: parseEnum(params, "sort", SORTS) ?? DEFAULT_SORT,
});

/** URL params for a set of filters. Defaults and empty values are omitted to keep URLs short and clean. */
export const queueFiltersToPatch = (values: QueueFilterValues): Record<string, string | undefined> => ({
  status: values.status,
  category: values.category,
  priority: values.priority,
  assignee: values.assignee,
  q: values.q,
  from: values.from,
  to: values.to,
  sort: values.sort && values.sort !== DEFAULT_SORT ? values.sort : undefined,
});

/** True when two filter sets are identical apart from the search text (which is debounced separately). */
export const sameExceptSearch = (a: QueueFilterValues, b: QueueFilterValues): boolean =>
  a.status === b.status &&
  a.category === b.category &&
  a.priority === b.priority &&
  a.assignee === b.assignee &&
  a.from === b.from &&
  a.to === b.to &&
  (a.sort ?? DEFAULT_SORT) === (b.sort ?? DEFAULT_SORT);
