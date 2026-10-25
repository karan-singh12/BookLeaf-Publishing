"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthorBookPanel } from "@/components/admin/AuthorBookPanel";
import { DraftComposer } from "@/components/admin/DraftComposer";
import { InternalNotes } from "@/components/admin/InternalNotes";
import { TriagePanel } from "@/components/admin/TriagePanel";
import { AttachmentList } from "@/components/tickets/AttachmentList";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/tickets/Badges";
import { MessageThread } from "@/components/tickets/MessageThread";
import { Card, CardBody, CardHeader, ErrorState, Skeleton } from "@/components/ui";
import { useTicketDetail } from "@/hooks/use-tickets";
import { formatDateTime, ticketRef } from "@/lib/format";
import type { AdminTicket } from "@/types/domain";

export default function AdminTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error, refetch } = useTicketDetail<AdminTicket>(id);

  if (isPending) {
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => refetch()} back={{ href: "/admin/tickets", label: "Back to Ticket Queue" }} />;

  const { ticket, messages, notes } = data;

  return (
    <div className="space-y-4">
      <Link href="/admin/tickets" className="text-sm text-ink-soft hover:text-ink">
        ← Ticket Queue
      </Link>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardBody>
              <p className="text-xs text-ink-soft">
                {ticketRef(ticket.number)} · Opened {formatDateTime(ticket.createdAt)} by {ticket.author.name}
              </p>
              <h1 className="break-anywhere mt-0.5 text-xl font-semibold tracking-tight">{ticket.subject}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
                <CategoryBadge category={ticket.category} />
              </div>
              <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Author&apos;s query</h2>
              <p className="break-anywhere mt-1 whitespace-pre-wrap text-sm">{ticket.description}</p>
              <AttachmentList attachments={ticket.attachments} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Conversation" />
            <CardBody>
              <MessageThread messages={messages} viewerRole="admin" originalText={ticket.description} emptyText="No replies yet. Send the first response below." />
            </CardBody>
          </Card>

          <DraftComposer ticket={ticket} />
          <InternalNotes ticketId={ticket.id} notes={notes} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <TriagePanel ticket={ticket} />
          <AuthorBookPanel ticket={ticket} />
        </aside>
      </div>
    </div>
  );
}
