import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";

export function StatTile({ label, value, hint, accent, className }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", accent ? "text-brand-700" : "text-ink")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}
