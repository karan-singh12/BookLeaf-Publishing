"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { PageSpinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { HOME_BY_ROLE } from "@/lib/constants";
import type { Role } from "@/types/domain";

/**
 * Keeps people on the side of the app that matches their role. This is a convenience, not security:
 * the API enforces the same rules on every request, so a hand-edited session gets 401/403 anyway.
 */
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    else if (status === "authenticated" && user && user.role !== role) router.replace(HOME_BY_ROLE[user.role]);
  }, [status, user, role, router]);

  if (status !== "authenticated" || user?.role !== role) return <PageSpinner />;
  return <>{children}</>;
}
