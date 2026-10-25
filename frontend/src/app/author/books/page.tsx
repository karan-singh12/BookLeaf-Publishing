"use client";

import { BookCard } from "@/components/books/BookCard";
import { BookSummary } from "@/components/books/BookSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useBooks } from "@/hooks/use-books";
import { firstName } from "@/lib/format";

export default function MyBooksPage() {
  const { user } = useAuth();
  const { data: books, isPending, error, refetch } = useBooks();

  return (
    <>
      <PageHeader
        title="My Books"
        description={user ? `Welcome back, ${firstName(user.name)}. Here is how your books are doing.` : "Your catalogue with sales and royalty details."}
        action={
          <ButtonLink href="/author/tickets/new">Raise a support query</ButtonLink>
        }
      />

      {isPending ? (
        <div className="space-y-6">
          <Skeleton className="h-24" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : books.length === 0 ? (
        <EmptyState title="No books yet" description="Once BookLeaf starts producing your book, it will appear here with its production stage." />
      ) : (
        <div className="space-y-6">
          <BookSummary books={books} />
          <div className="grid gap-4 md:grid-cols-2">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
