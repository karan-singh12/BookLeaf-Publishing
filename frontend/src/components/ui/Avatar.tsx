import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const TINTS = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
];

const SIZES = { sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-11 text-sm" };

/** The same name always gets the same colour, so people are recognisable at a glance. */
const tintFor = (name: string): string => TINTS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TINTS.length]!;

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  /** BookLeaf staff use the solid brand colour so they stand out from authors. */
  staff?: boolean;
  className?: string;
}

export function Avatar({ name, size = "md", staff = false, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      title={name}
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", SIZES[size], staff ? "bg-brand-700 text-white" : tintFor(name), className)}
    >
      {initials(name)}
    </span>
  );
}
