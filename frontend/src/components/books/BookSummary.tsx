import { StatTile } from "@/components/ui";
import { formatInr, formatNumber } from "@/lib/format";
import type { Book } from "@/types/domain";

/** Totals across all of an author's books. In-production books contribute zeros, never NaN. */
export function BookSummary({ books }: { books: Book[] }) {
  const totals = books.reduce(
    (sum, book) => ({
      copies: sum.copies + book.copiesSold,
      earned: sum.earned + book.royaltyEarned,
      paid: sum.paid + book.royaltyPaid,
      pending: sum.pending + book.royaltyPending,
    }),
    { copies: 0, earned: 0, paid: 0, pending: 0 },
  );
  const live = books.filter((book) => book.isPublished).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile label="Books" value={books.length} hint={`${live} live, ${books.length - live} in production`} />
      <StatTile label="Copies sold" value={formatNumber(totals.copies)} />
      <StatTile label="Royalty earned" value={formatInr(totals.earned)} />
      <StatTile label="Royalty paid" value={formatInr(totals.paid)} />
      <StatTile label="Royalty pending" value={formatInr(totals.pending)} accent className="col-span-2 lg:col-span-1" />
    </div>
  );
}
