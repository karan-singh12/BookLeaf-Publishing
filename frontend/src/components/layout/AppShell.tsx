"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLiveConnected } from "@/hooks/use-live-status";
import { useTicketStream } from "@/hooks/use-ticket-stream";
import { cn } from "@/lib/cn";
import { displayName } from "@/lib/format";
import type { Role } from "@/types/domain";

interface NavItem {
  href: string;
  label: string;
  /** Also highlighted for nested routes. */
  match?: string;
}

const NAV: Record<Role, NavItem[]> = {
  author: [
    { href: "/author/books", label: "My Books" },
    { href: "/author/tickets", label: "My Tickets", match: "/author/tickets" },
  ],
  admin: [{ href: "/admin/tickets", label: "Ticket Queue", match: "/admin/tickets" }],
};

function Brand() {
  return (
    <span className="flex items-center gap-2 font-semibold text-ink">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-700 text-sm text-white">
        B
      </span>
      BookLeaf <span className="font-normal text-ink-soft">Support</span>
    </span>
  );
}

function LiveIndicator() {
  const connected = useLiveConnected();
  return (
    <span className="hidden items-center gap-1.5 text-xs text-ink-soft sm:flex" title={connected ? "Updates arrive instantly" : "Reconnecting; refreshing every few seconds"}>
      <span className={cn("size-2 rounded-full", connected ? "bg-emerald-500" : "bg-amber-400")} />
      {connected ? "Live" : "Reconnecting"}
    </span>
  );
}

/** Header, role-based navigation and the live-update subscription shared by both portals. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  useTicketStream(Boolean(user));

  if (!user) return null;
  const items = NAV[user.role];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href={items[0].href} aria-label="BookLeaf Support home">
            <Brand />
          </Link>

          <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto sm:order-0 sm:w-auto">
            {items.map((item) => {
              const active = pathname === item.href || (item.match ? pathname.startsWith(item.match) && !pathname.endsWith("/new") : false);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium", active ? "bg-brand-50 text-brand-800" : "text-ink-soft hover:bg-slate-100")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <LiveIndicator />
            <div className="flex items-center gap-2.5">
              <Avatar name={user.name} staff={user.role === "admin"} />
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-ink">{displayName(user.name)}</p>
                <p className="text-xs capitalize text-ink-soft">{user.role === "admin" ? "BookLeaf staff" : "Author"}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
