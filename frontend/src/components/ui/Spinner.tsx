import { cn } from "@/lib/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <svg role="status" aria-label={label} className={cn("size-5 animate-spin text-current", className)} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** A full-width centred spinner for page-level loading. */
export function PageSpinner() {
  return (
    <div className="flex justify-center py-24 text-brand-700">
      <Spinner className="size-8" />
    </div>
  );
}
