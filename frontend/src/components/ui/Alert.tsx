import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Kind = "info" | "success" | "warning" | "error";

const KINDS: Record<Kind, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export function Alert({ kind = "info", title, children, className }: { kind?: Kind; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", KINDS[kind], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
    </div>
  );
}
