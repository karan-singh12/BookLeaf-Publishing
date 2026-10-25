import { Badge, Card } from "@/components/ui";
import { formatDate, formatInr, formatNumber } from "@/lib/format";
import type { Book } from "@/types/domain";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "good" }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className={tone === "warn" ? "font-semibold text-amber-700" : tone === "good" ? "font-semibold text-brand-700" : "font-semibold text-ink"}>{value}</dd>
    </div>
  );
}

/** What the payout situation means in words, so "₹0 pending" and "never paid" read differently. */
const payoutNote = (book: Book): string => {
  if (book.royaltyPending === 0) return "Nothing pending. You're fully paid up.";
  if (!book.lastPayoutDate) return "No payout has been made for this book yet.";
  return `Last payout on ${formatDate(book.lastPayoutDate)}.`;
};

/** How much of the royalty earned has actually been paid out. */
function PaidBar({ book }: { book: Book }) {
  if (book.royaltyEarned <= 0) return null;
  const share = Math.min(100, Math.round((book.royaltyPaid / book.royaltyEarned) * 100));
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs text-ink-soft">
        <span>Paid out</span>
        <span className="font-medium tabular-nums text-ink">{share}% of earned</span>
      </div>
      <div role="progressbar" aria-label="Share of earned royalty already paid" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share} className="h-2 overflow-hidden rounded-full bg-amber-100">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function BookCard({ book }: { book: Book }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-anywhere text-base font-semibold text-ink">{book.title}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{book.genre}</p>
        </div>
        <Badge tone={book.isPublished ? "green" : "amber"}>{book.isPublished ? "Published & Live" : book.status.replace("In Production - ", "In production: ")}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-ink-soft">ISBN</dt>
          <dd className="font-mono text-xs text-ink">{book.isbn}</dd>
        </div>
        <Stat label="Published" value={book.isPublished ? formatDate(book.publicationDate) : "Not yet"} />
        <Stat label="MRP" value={formatInr(book.mrp)} />
      </dl>

      {book.isPublished ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <Stat label="Copies sold" value={formatNumber(book.copiesSold)} />
            <Stat label="Royalty per copy" value={formatInr(book.royaltyPerCopy)} />
            <Stat label="Total royalty earned" value={formatInr(book.royaltyEarned)} />
            <Stat label="Royalty paid" value={formatInr(book.royaltyPaid)} tone="good" />
            <Stat label="Royalty pending" value={formatInr(book.royaltyPending)} tone={book.royaltyPending > 0 ? "warn" : undefined} />
          </dl>
          <PaidBar book={book} />
          <p className="mt-2 text-xs text-ink-soft">{payoutNote(book)}</p>
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
            {book.platforms.map((platform) => (
              <Badge key={platform}>{platform}</Badge>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sales and royalties will appear here once this book is published and live.
        </p>
      )}
    </Card>
  );
}
