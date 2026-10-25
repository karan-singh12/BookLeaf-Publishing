"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusTabs } from "@/components/tickets/StatusTabs";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button, ButtonLink, EmptyState, ErrorState, PageSpinner, Pagination, Skeleton } from "@/components/ui";
import { useMyTickets } from "@/hooks/use-tickets";
import { useUrlParams } from "@/hooks/use-url-params";
import { parseEnum, parsePage } from "@/lib/url-state";
import { TICKET_STATUSES, type TicketStatus } from "@/types/domain";

const PAGE_SIZE = 10;

export default function MyTicketsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <MyTickets />
    </Suspense>
  );
}

/** The selected status tab and page are kept in the URL, so a reload keeps your place. */
function MyTickets() {
  const { params, update } = useUrlParams();
  const status = parseEnum(params, "status", TICKET_STATUSES);
  const page = parsePage(params);
  const { data, isPending, error, refetch } = useMyTickets({ status, page, limit: PAGE_SIZE });

  const changeStatus = (next: TicketStatus | undefined) => update({ status: next, page: undefined });

  return (
    <>
      <PageHeader
        title="My Tickets"
        description="Your support queries and the replies from the BookLeaf team. This page updates by itself."
        action={<ButtonLink href="/author/tickets/new">New query</ButtonLink>}
      />

      <div className="mb-5">
        <StatusTabs value={status} onChange={changeStatus} />
      </div>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        status ? (
          <EmptyState
            title={`No ${status.toLowerCase()} tickets`}
            description="Try a different status, or view all your tickets."
            action={
              <Button variant="secondary" onClick={() => changeStatus(undefined)}>
                Show all
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="You haven't raised any queries yet"
            description="Questions about royalties, your ISBN, printing or your book's status? We're here to help."
            action={<ButtonLink href="/author/tickets/new">Raise your first query</ButtonLink>}
          />
        )
      ) : (
        <div className="space-y-4">
          {data.items.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          <Pagination meta={data.meta} onPageChange={(next) => update({ page: next > 1 ? String(next) : undefined })} />
        </div>
      )}
    </>
  );
}
