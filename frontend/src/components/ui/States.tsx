import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "./Button";

/** Placeholder block shown while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

/** Nothing to show yet: say why, and offer the next step. */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Retrying only helps when the problem is on the way (no connection, server trouble, rate limit), not when the answer is a definite 4xx. */
const isRetryable = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return true;
  return error.status === 0 || error.status >= 500 || error.status === 408 || error.status === 429;
};

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** Where to go instead when retrying can't help (e.g. the ticket doesn't exist). */
  back?: { href: string; label: string };
}

/** A failed request, with the server's own message. Offers "Try again" only when it could actually work. */
export function ErrorState({ error, onRetry, back }: ErrorStateProps) {
  const message = error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
  const notFound = error instanceof ApiError && error.status === 404;
  const retryable = isRetryable(error);

  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <p className="text-base font-semibold text-red-900">{notFound ? "We couldn't find that" : "We couldn't load this"}</p>
      <p className="mt-1 max-w-md text-sm text-red-800">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {retryable && onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        {back && (
          <ButtonLink href={back.href} variant={retryable && onRetry ? "ghost" : "secondary"}>
            {back.label}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
