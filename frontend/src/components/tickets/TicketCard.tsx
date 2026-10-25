import Link from "next/link";
import { Card } from "@/components/ui";
import { replyPreview, ticketRef, timeAgo } from "@/lib/format";
import type { Ticket } from "@/types/domain";
import { CategoryBadge, StatusBadge } from "./Badges";

/** One row of the author's "My Tickets" list: the query, its status, and the latest reply from BookLeaf. */
export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link href={`/author/tickets/${ticket.id}`} className="block rounded-xl focus-visible:outline-offset-4">
      <Card className="p-5 transition-shadow hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-soft">
              {ticketRef(ticket.number)} · {timeAgo(ticket.createdAt)}
            </p>
            <h3 className="break-anywhere mt-0.5 text-base font-semibold text-ink">{ticket.subject}</h3>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <CategoryBadge category={ticket.category} />
          <span>{ticket.book ? ticket.book.title : "General / Account Level"}</span>
        </div>

        <p className="break-anywhere mt-3 line-clamp-2 text-sm text-ink-soft">{ticket.description}</p>

        {ticket.latestReply ? (
          <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm">
            <p className="text-xs font-medium text-brand-800">
              BookLeaf replied {timeAgo(ticket.latestReply.createdAt)}
              {ticket.replyCount > 1 ? ` · ${ticket.replyCount} replies` : ""}
            </p>
            <p className="break-anywhere mt-0.5 line-clamp-2 text-ink">{replyPreview(ticket.latestReply.body)}</p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-soft">Waiting for a reply from the BookLeaf team.</p>
        )}
      </Card>
    </Link>
  );
}
