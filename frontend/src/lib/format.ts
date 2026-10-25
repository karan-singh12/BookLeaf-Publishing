const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** ₹ with Indian digit grouping: ₹1,23,456. Null (not applicable) renders as an em dash. */
export const formatInr = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? "—" : `₹${amount.toLocaleString("en-IN")}`;

export const formatNumber = (value: number): string => value.toLocaleString("en-IN");

export const formatDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export const ageInHours = (iso: string, now: number = Date.now()): number => Math.max(0, (now - new Date(iso).getTime()) / HOUR_MS);

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a calendar date after a month. */
export const timeAgo = (iso: string, now: number = Date.now()): string => {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < 60_000) return "just now";
  if (diff < HOUR_MS) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} h ago`;
  if (diff < 30 * DAY_MS) return `${Math.floor(diff / DAY_MS)} d ago`;
  return formatDate(iso);
};

/** Compact age for the queue: "3h", "2d". */
export const shortAge = (iso: string, now: number = Date.now()): string => {
  const hours = ageInHours(iso, now);
  return hours < 1 ? "<1h" : hours < 48 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ticketRef = (number: number): string => `#${number}`;

export const firstName = (name: string): string => name.split(" ")[0] ?? name;

/** Drops a trailing role note: "Aditi Verma (Support Ops)" -> "Aditi Verma". */
export const displayName = (name: string): string => name.replace(/\s*\(.*?\)\s*/g, " ").trim();

/** "Priya Sharma" -> "PS". Names like "Aditi Verma (Support Ops)" use the first two words only. */
export const initials = (name: string): string =>
  name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

/** One-line preview of a reply: flattened to a single line, with the "Hi Priya," greeting dropped so the useful part shows. */
export const replyPreview = (body: string): string => body.replace(/\s+/g, " ").trim().replace(/^(?:hi|hello|dear)\s+[^,]{1,40},\s*/i, "");
