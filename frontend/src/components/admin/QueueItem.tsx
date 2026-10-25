import Link from "next/link";
import { Avatar, Badge } from "@/components/ui";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/tickets/Badges";
import { OVERDUE_AFTER_HOURS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { ageInHours, displayName, firstName, shortAge, ticketRef } from "@/lib/format";
import type { AdminTicket } from "@/types/domain";

const isActive = (ticket: AdminTicket): boolean => ticket.status === "Open" || ticket.status === "In Progress";

const EDGE: Partial<Record<AdminTicket["priority"], string>> = {
  Critical: "border-l-red-500",
  High: "border-l-orange-400",
};

/** Who owns the ticket: their avatar and first name, or an obvious "Unassigned". */
function Owner({ assignee }: { assignee: AdminTicket["assignee"] }) {
  if (!assignee) return <span className="rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-ink-soft">Unassigned</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft" title={`Assigned to ${displayName(assignee.name)}`}>
      <Avatar name={assignee.name} size="sm" staff />
      {firstName(displayName(assignee.name))}
    </span>
  );
}

/** One row in the queue. Urgency is visible at a glance: priority, a coloured edge, and an overdue flag. */
export function QueueItem({ ticket }: { ticket: AdminTicket }) {
  const active = isActive(ticket);
  const overdue = active && ageInHours(ticket.createdAt) > OVERDUE_AFTER_HOURS;

  return (
    <li>
      <Link
        href={`/admin/tickets/${ticket.id}`}
        className={cn(
          "flex gap-4 rounded-xl border border-l-4 border-line bg-surface p-4 shadow-sm transition hover:-translate-y-px hover:shadow-md",
          active ? (EDGE[ticket.priority] ?? "border-l-line") : "border-l-line opacity-75",
        )}
      >
        <Avatar name={ticket.author.name} size="lg" className="hidden sm:inline-grid" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-soft">{ticketRef(ticket.number)}</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {overdue && <Badge tone="red">Overdue</Badge>}
            {ticket.ai.status === "pending" && <Badge tone="violet">AI triaging…</Badge>}
          </div>
          <h3 className="break-anywhere mt-1.5 text-base font-semibold text-ink">{ticket.subject}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {ticket.author.name} · {ticket.book?.title ?? "General / Account Level"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CategoryBadge category={ticket.category} />
            {(ticket.categoryOverridden || ticket.priorityOverridden) && <Badge tone="violet">Overridden by staff</Badge>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          <p className={cn("text-sm font-semibold tabular-nums", overdue ? "text-red-700" : "text-ink")}>{shortAge(ticket.createdAt)} old</p>
          <Owner assignee={ticket.assignee} />
          <p className="text-xs text-ink-soft">
            {ticket.replyCount} {ticket.replyCount === 1 ? "reply" : "replies"}
          </p>
        </div>
      </Link>
    </li>
  );
}
