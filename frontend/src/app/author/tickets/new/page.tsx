"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { TicketForm } from "@/components/tickets/TicketForm";
import { Alert, Card, CardBody } from "@/components/ui";
import { useBooks } from "@/hooks/use-books";

export default function NewTicketPage() {
  const { data: books, error } = useBooks();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/author/tickets" className="text-sm text-ink-soft hover:text-ink">
        ← My Tickets
      </Link>
      <div className="mt-3">
        <PageHeader title="Submit a support query" description="Tell us what's going on and we'll get back to you here." />
      </div>

      {error && <Alert kind="warning" className="mb-4">We couldn&apos;t load your books, so you can only choose &ldquo;General / Account Level&rdquo; for now.</Alert>}

      <Card>
        <CardBody>
          <TicketForm books={books ?? []} />
        </CardBody>
      </Card>
    </div>
  );
}
