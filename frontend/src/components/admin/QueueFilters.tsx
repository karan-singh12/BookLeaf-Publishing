"use client";

import { useState } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type QueueFilterValues, type TicketCategory, type TicketPriority, type TicketSort, type TicketStatus } from "@/types/domain";

interface QueueFiltersProps {
  value: QueueFilterValues;
  onChange: (next: QueueFilterValues) => void;
}

const SORTS: Array<{ value: TicketSort; label: string }> = [
  { value: "urgency", label: "Most urgent first" },
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "activity", label: "Recent activity" },
];

/** Empty string in a select means "any"; this maps it to an absent filter. */
const optional = <T extends string>(raw: string): T | undefined => (raw ? (raw as T) : undefined);

/**
 * The everyday filters (search, status, priority, assignee) are always visible; the rest sit behind
 * "More filters" so the tickets themselves start near the top of the screen. If a hidden filter is
 * active (say, from a shared link) the panel opens by itself so nothing is filtering invisibly.
 */
export function QueueFilters({ value, onChange }: QueueFiltersProps) {
  const set = (patch: Partial<QueueFilterValues>) => onChange({ ...value, ...patch });

  const hiddenActive = [value.category, value.from, value.to, value.sort && value.sort !== "urgency" ? value.sort : undefined].filter(Boolean).length;
  const anyActive = hiddenActive > 0 || Boolean(value.status || value.priority || value.assignee || value.q);
  const [expanded, setExpanded] = useState(hiddenActive > 0);

  return (
    <form role="search" aria-label="Filter tickets" onSubmit={(event) => event.preventDefault()} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <Input label="Search" placeholder="Subject, text or ticket number" value={value.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} />
        <Select label="Status" value={value.status ?? ""} onChange={(e) => set({ status: optional<TicketStatus>(e.target.value) })}>
          <option value="">Any status</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </Select>
        <Select label="Priority" value={value.priority ?? ""} onChange={(e) => set({ priority: optional<TicketPriority>(e.target.value) })}>
          <option value="">Any priority</option>
          {TICKET_PRIORITIES.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </Select>
        <Select label="Assigned to" value={value.assignee ?? ""} onChange={(e) => set({ assignee: optional<"me" | "unassigned">(e.target.value) })}>
          <option value="">Anyone</option>
          <option value="me">Me</option>
          <option value="unassigned">Unassigned</option>
        </Select>
      </div>

      {expanded && (
        <div id="more-filters" className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Category" value={value.category ?? ""} onChange={(e) => set({ category: optional<TicketCategory>(e.target.value) })}>
            <option value="">Any category</option>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
          <Select label="Sort by" value={value.sort ?? "urgency"} onChange={(e) => set({ sort: e.target.value as TicketSort })}>
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </Select>
          <Input label="Opened from" type="date" value={value.from ?? ""} max={value.to} onChange={(e) => set({ from: e.target.value || undefined })} />
          <Input label="Opened until" type="date" value={value.to ?? ""} min={value.from} onChange={(e) => set({ to: e.target.value || undefined })} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls="more-filters" onClick={() => setExpanded((open) => !open)}>
          {expanded ? "Fewer filters ▴" : "More filters ▾"}
          {!expanded && hiddenActive > 0 && <Badge tone="green">{hiddenActive} active</Badge>}
        </Button>
        {anyActive && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ sort: value.sort })}>
            Clear filters
          </Button>
        )}
      </div>
    </form>
  );
}
