import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "green" | "blue" | "amber" | "red" | "orange" | "violet";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  orange: "bg-orange-50 text-orange-800 ring-orange-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
};

/** Colour is never the only signal: badges always carry text. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}
