"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageSpinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { HOME_BY_ROLE } from "@/lib/constants";

/** The entry point only decides where to send you: your portal, or the sign-in page. */
export default function RootPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(HOME_BY_ROLE[user.role]);
    else if (status === "anonymous") router.replace("/login");
  }, [status, user, router]);

  return <PageSpinner />;
}
