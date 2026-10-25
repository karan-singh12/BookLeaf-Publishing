import type { Role } from "@/types/domain";

/** A ticket still waiting after this long is flagged as overdue in the admin queue. */
export const OVERDUE_AFTER_HOURS = 48;

/** Fallback refresh (ms) used only while the live stream is disconnected. */
export const POLL_INTERVAL_MS = 20_000;

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const HOME_BY_ROLE: Record<Role, string> = {
  author: "/author/books",
  admin: "/admin/tickets",
};

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** One-click sign-ins shown on the login page when DEMO_MODE is on. Matches the seeded data. */
export const DEMO_PASSWORD = "Password123!";
export const DEMO_ACCOUNTS = [
  { label: "Priya Sharma", hint: "Author · 2 published books", email: "priya.sharma@email.com" },
  { label: "Sneha Kulkarni", hint: "Author · includes a book in production", email: "sneha.kulkarni@email.com" },
  { label: "Ananya Reddy", hint: "Author · royalty never paid", email: "ananya.reddy@email.com" },
  { label: "Aditi Verma", hint: "Admin · support operations", email: "admin@bookleaf.pub" },
] as const;
