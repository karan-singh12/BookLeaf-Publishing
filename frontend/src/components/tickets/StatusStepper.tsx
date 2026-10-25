import { cn } from "@/lib/cn";
import { TICKET_STATUSES, type TicketStatus } from "@/types/domain";

/** Where a ticket is in its life: Open, In Progress, Resolved, Closed. Steps up to the current one are filled. */
export function StatusStepper({ status }: { status: TicketStatus }) {
  const current = TICKET_STATUSES.indexOf(status);

  return (
    <ol aria-label="Ticket progress" className="flex items-center">
      {TICKET_STATUSES.map((step, index) => {
        const reached = index <= current;
        const isCurrent = index === current;
        return (
          <li key={step} aria-current={isCurrent ? "step" : undefined} className={cn("flex items-center", index < TICKET_STATUSES.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[11px] font-semibold ring-4",
                  reached ? "bg-brand-700 text-white" : "bg-slate-200 text-ink-soft",
                  isCurrent ? "ring-brand-100" : "ring-transparent",
                )}
              >
                {reached && !isCurrent ? "✓" : index + 1}
              </span>
              <span className={cn("whitespace-nowrap text-xs", isCurrent ? "font-semibold text-ink" : reached ? "text-ink-soft" : "text-ink-faint")}>{step}</span>
            </div>
            {index < TICKET_STATUSES.length - 1 && <span aria-hidden className={cn("mx-2 mb-5 h-0.5 flex-1 rounded", index < current ? "bg-brand-700" : "bg-slate-200")} />}
          </li>
        );
      })}
    </ol>
  );
}
