"use client";

import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui";

/** Shown after the API rejected an expired session and sent the user back to sign in. */
export function SessionExpiredNotice() {
  const expired = useSearchParams().get("expired") === "1";
  if (!expired) return null;
  return <Alert kind="warning">Your session has expired. Please sign in again.</Alert>;
}
