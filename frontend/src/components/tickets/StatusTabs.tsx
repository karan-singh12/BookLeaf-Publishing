import { cn } from "@/lib/cn";
import { TICKET_STATUSES, type TicketStatus } from "@/types/domain";

type Value = TicketStatus | undefined;

/** "All | Open | In Progress | ..." filter tabs. */
export function StatusTabs({ value, onChange }: { value: Value; onChange: (status: Value) => void }) {
  const options: Array<{ label: string; value: Value }> = [{ label: "All", value: undefined }, ...TICKET_STATUSES.map((status) => ({ label: status, value: status as Value }))];
  return (
    <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", selected ? "bg-brand-700 text-white" : "bg-surface text-ink-soft ring-1 ring-inset ring-line hover:bg-slate-50")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
