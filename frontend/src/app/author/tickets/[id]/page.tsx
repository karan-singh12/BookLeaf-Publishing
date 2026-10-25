"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AttachmentList } from "@/components/tickets/AttachmentList";
import { CategoryBadge, StatusBadge } from "@/components/tickets/Badges";
import { MessageThread } from "@/components/tickets/MessageThread";
import { StatusStepper } from "@/components/tickets/StatusStepper";
import { ReplyBox } from "@/components/tickets/ReplyBox";
import { Alert, Card, CardBody, CardHeader, ErrorState, Skeleton } from "@/components/ui";
import { useSendMessage, useTicketDetail } from "@/hooks/use-tickets";
import { formatDateTime, ticketRef } from "@/lib/format";

export default function AuthorTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error, refetch } = useTicketDetail(id);
  const send = useSendMessage(id);

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => refetch()} back={{ href: "/author/tickets", label: "Back to My Tickets" }} />;

  const { ticket, messages } = data;
  const closed = ticket.status === "Closed";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/author/tickets" className="text-sm text-ink-soft hover:text-ink">
        ← My Tickets
      </Link>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-ink-soft">
                {ticketRef(ticket.number)} · Submitted {formatDateTime(ticket.createdAt)}
              </p>
              <h1 className="break-anywhere mt-0.5 text-xl font-semibold tracking-tight">{ticket.subject}</h1>
            </div>
            <StatusBadge status={ticket.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <CategoryBadge category={ticket.category} />
            <span>{ticket.book ? ticket.book.title : "General / Account Level"}</span>
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
            <StatusStepper status={ticket.status} />
          </div>

          <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Your query</h2>
          <p className="break-anywhere mt-1 whitespace-pre-wrap text-sm text-ink">{ticket.description}</p>
          <AttachmentList attachments={ticket.attachments} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Conversation" />
        <CardBody>
          <MessageThread messages={messages} viewerRole="author" originalText={ticket.description} emptyText="No replies yet. Our team will respond here, usually within 48 hours." />
        </CardBody>
      </Card>

      {closed ? (
        <Alert kind="info">This ticket is closed. If you need more help, please <Link href="/author/tickets/new" className="font-medium underline">submit a new query</Link>.</Alert>
      ) : (
        <Card>
          <CardBody>
            {ticket.status === "Resolved" && <Alert kind="info" className="mb-4">This ticket is marked resolved. Replying will reopen it.</Alert>}
            <ReplyBox
              label="Add a reply"
              placeholder="Add more details or ask a follow-up question"
              submitLabel="Send reply"
              successMessage="Reply sent."
              onSend={(body) => send.mutateAsync({ body })}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
