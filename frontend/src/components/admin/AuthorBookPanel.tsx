"use client";

import { Badge, Card, CardBody, CardHeader, Skeleton } from "@/components/ui";
import { useBook } from "@/hooks/use-books";
import { formatDate, formatInr, formatNumber } from "@/lib/format";
import type { AdminTicket } from "@/types/domain";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="break-anywhere text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Everything an admin needs to answer without opening another tool: who is asking and the book's real numbers. */
export function AuthorBookPanel({ ticket }: { ticket: AdminTicket }) {
  const { data: book, isPending } = useBook(ticket.book?.id);

  return (
    <>
      <Card>
        <CardHeader title="Author" />
        <CardBody>
          <p className="font-semibold text-ink">{ticket.author.name}</p>
          <p className="break-anywhere text-sm text-ink-soft">{ticket.author.email}</p>
          {ticket.author.authorCode && <p className="mt-1 text-xs text-ink-soft">{ticket.author.authorCode}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Book" action={book && <Badge tone={book.isPublished ? "green" : "amber"}>{book.isPublished ? "Live" : "In production"}</Badge>} />
        <CardBody>
          {!ticket.book ? (
            <p className="text-sm text-ink-soft">General / account-level query. No book attached.</p>
          ) : isPending ? (
            <Skeleton className="h-36" />
          ) : book ? (
            <>
              <p className="font-semibold text-ink">{book.title}</p>
              <p className="mb-2 text-xs text-ink-soft">{book.status}</p>
              <dl className="divide-y divide-line border-t border-line">
                <Row label="ISBN" value={book.isbn} />
                {book.isPublished ? (
                  <>
                    <Row label="Published" value={formatDate(book.publicationDate)} />
                    <Row label="Copies sold" value={formatNumber(book.copiesSold)} />
                    <Row label="Royalty earned" value={formatInr(book.royaltyEarned)} />
                    <Row label="Royalty paid" value={formatInr(book.royaltyPaid)} />
                    <Row label="Royalty pending" value={formatInr(book.royaltyPending)} />
                    <Row label="Last payout" value={book.lastPayoutDate ? formatDate(book.lastPayoutDate) : "None yet"} />
                    <Row label="Print partner" value={book.printPartner ?? "—"} />
                    <Row label="Listed on" value={book.platforms.join(", ") || "—"} />
                  </>
                ) : (
                  <Row label="Royalties" value="Not yet on sale" />
                )}
              </dl>
            </>
          ) : (
            <p className="text-sm text-ink-soft">Book details unavailable.</p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
