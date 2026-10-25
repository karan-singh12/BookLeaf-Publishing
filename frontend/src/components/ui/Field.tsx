import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-faint disabled:bg-slate-50 disabled:text-ink-faint";

const controlClass = (error?: string, extra?: string) => cn(CONTROL, error ? "border-red-400" : "border-line", extra);

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  /** Receives the generated id (for the label) and aria props (for the control). */
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => ReactNode;
}

/** Label + control + hint/error, wired together for screen readers. */
function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error || hint ? `${id}-note` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {(error || hint) && (
        <p id={describedBy} className={cn("text-xs", error ? "text-red-600" : "text-ink-soft")} role={error ? "alert" : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: ReactNode };

export function Input({ label, error, hint, className, required, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {(aria) => <input {...aria} required={required} className={controlClass(error, cn("h-10", className))} {...rest} />}
    </FieldShell>
  );
}

export function Textarea({ label, error, hint, className, required, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {(aria) => <textarea {...aria} required={required} className={controlClass(error, cn("min-h-28 py-2", className))} {...rest} />}
    </FieldShell>
  );
}

export function Select({ label, error, hint, className, required, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {(aria) => (
        <select {...aria} required={required} className={controlClass(error, cn("h-10", className))} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}
