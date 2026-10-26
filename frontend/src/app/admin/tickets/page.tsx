"use client";

import { Suspense, useEffect, useState } from "react";
import { OnboardAuthorModal } from "@/components/admin/OnboardAuthorModal";
import { QueueFilters } from "@/components/admin/QueueFilters";
import { QueueItem } from "@/components/admin/QueueItem";
import { QueueStats } from "@/components/admin/QueueStats";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState, ErrorState, PageSpinner, Pagination, Skeleton } from "@/components/ui";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueue, useTicketStats } from "@/hooks/use-tickets";
import { useUrlParams } from "@/hooks/use-url-params";
import { parsePage, parseQueueFilters, queueFiltersToPatch, sameExceptSearch } from "@/lib/url-state";
import type { QueueFilterValues } from "@/types/domain";

const PAGE_SIZE = 15;

export default function TicketQueuePage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense fallback={<PageSpinner />}>
      <TicketQueue />
    </Suspense>
  );
}

/**
 * The queue's state lives in the URL (?status=Open&priority=High&page=2...), so a reload,
 * the back button or a copied link shows the same view. Only the search box keeps local text while
 * you type; it is written to the URL once you pause, so each keystroke isn't a request.
 */
function TicketQueue() {
  const { params, update } = useUrlParams();
  const filters = parseQueueFilters(params);
  const page = parsePage(params);

  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q ?? "");
  const [urlSearch, setUrlSearch] = useState(filters.q ?? "");
  if ((filters.q ?? "") !== urlSearch) {
    // The URL changed from outside (back button, link): follow it.
    setUrlSearch(filters.q ?? "");
    setSearchText(filters.q ?? "");
  }

  const debouncedSearch = useDebounce(searchText);
  useEffect(() => {
    // Write the search to the URL once typing settles (searchText === debouncedSearch) and it differs from the URL.
    if (searchText === debouncedSearch && debouncedSearch.trim() !== (filters.q ?? "")) {
      update({ q: debouncedSearch.trim() || undefined, page: undefined });
    }
  }, [searchText, debouncedSearch, filters.q, update]);

  const stats = useTicketStats();
  const queue = useQueue({ ...filters, page, limit: PAGE_SIZE });

  const onFiltersChange = (next: QueueFilterValues) => {
    setSearchText(next.q ?? "");
    // Typing alone is handled by the debounce above; any other change (or "Clear filters") is written now.
    if (sameExceptSearch(next, filters)) return;
    update({ ...queueFiltersToPatch(next), page: undefined });
  };

  return (
    <>
      <PageHeader
        title="Ticket Queue"
        description="Active tickets are listed first, most urgent and oldest at the top. New tickets and replies appear live."
        action={
          <Button variant="primary" size="sm" onClick={() => setIsOnboardOpen(true)}>
            + Onboard Author
          </Button>
        }
      />

      <OnboardAuthorModal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
      />

      <div className="space-y-5">
        <QueueStats stats={stats.data} />
        <QueueFilters value={{ ...filters, q: searchText }} onChange={onFiltersChange} />

        {queue.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : queue.error ? (
          <ErrorState error={queue.error} onRetry={() => queue.refetch()} />
        ) : queue.data.items.length === 0 ? (
          <EmptyState title="No tickets match these filters" description="Try clearing a filter or widening the date range." />
        ) : (
          <>
            <ul className="space-y-3" aria-label="Tickets">
              {queue.data.items.map((ticket) => (
                <QueueItem key={ticket.id} ticket={ticket} />
              ))}
            </ul>
            <Pagination meta={queue.data.meta} onPageChange={(next) => update({ page: next > 1 ? String(next) : undefined })} />
          </>
        )}
      </div>
    </>
  );
}
