"use client";

import { Badge, Button, Card, CardBody, CardHeader, Select, useToast } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useUpdateTicket } from "@/hooks/use-tickets";
import { ApiError } from "@/lib/api-client";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type AdminTicket, type TicketCategory, type TicketPriority, type TicketStatus, type UpdateTicketInput } from "@/types/domain";

/** What the classifier did, in words an admin can act on. */
function AiNote({ ticket, field }: { ticket: AdminTicket; field: "category" | "priority" }) {
  const { ai } = ticket;
  const overridden = field === "category" ? ticket.categoryOverridden : ticket.priorityOverridden;
  const suggestion = ai[field];

  if (ai.status === "pending") return <p className="mt-1 text-xs text-violet-700">AI is classifying this ticket…</p>;
  if (overridden) {
    return (
      <p className="mt-1 text-xs text-ink-soft">
        <Badge tone="violet">Overridden</Badge> AI suggested <strong>{suggestion}</strong>.
      </p>
    );
  }
  const by = ai.source === "llm" ? `AI (${ai.model ?? "model"})` : "Keyword rules (AI unavailable)";
  return <p className="mt-1 text-xs text-ink-soft">Set by {by}.</p>;
}

/** Status, category and priority overrides, and ticket assignment. Every change saves immediately. */
export function TriagePanel({ ticket }: { ticket: AdminTicket }) {
  const { user } = useAuth();
  const toast = useToast();
  const update = useUpdateTicket(ticket.id);
  const mine = ticket.assignee?.id === user?.id;

  const save = (patch: UpdateTicketInput, success: string) =>
    update.mutate(patch, {
      onSuccess: () => toast.success(success),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not save the change."),
    });

  return (
    <Card>
      <CardHeader title="Triage" />
      <CardBody className="space-y-4">
        <Select label="Status" value={ticket.status} disabled={update.isPending} onChange={(e) => save({ status: e.target.value as TicketStatus }, "Status updated.")}>
          {TICKET_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </Select>

        <div>
          <Select label="Category" value={ticket.category} disabled={update.isPending} onChange={(e) => save({ category: e.target.value as TicketCategory }, "Category updated.")}>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
          <AiNote ticket={ticket} field="category" />
        </div>

        <div>
          <Select label="Priority" value={ticket.priority} disabled={update.isPending} onChange={(e) => save({ priority: e.target.value as TicketPriority }, "Priority updated.")}>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </Select>
          <AiNote ticket={ticket} field="priority" />
          {ticket.ai.reasoning && ticket.ai.source === "llm" && <p className="mt-1.5 rounded-md bg-violet-50 px-2.5 py-1.5 text-xs text-violet-900">AI reasoning: {ticket.ai.reasoning}</p>}
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Assigned to</p>
          <p className="mt-0.5 text-sm text-ink-soft">{ticket.assignee ? (mine ? "You" : ticket.assignee.name) : "Nobody yet"}</p>
          <div className="mt-2 flex gap-2">
            {!mine && (
              <Button size="sm" disabled={update.isPending} onClick={() => save({ assignee: "me" }, "Assigned to you.")}>
                Assign to me
              </Button>
            )}
            {ticket.assignee && (
              <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => save({ assignee: null }, "Ticket unassigned.")}>
                Unassign
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
