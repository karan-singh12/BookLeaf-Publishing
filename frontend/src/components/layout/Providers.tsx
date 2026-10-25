"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ApiError } from "@/lib/api-client";
import { ToastProvider } from "@/components/ui";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // Retrying a 4xx (not found, forbidden, validation) can never succeed; only retry network/server trouble.
        retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session; created lazily so it is never shared between users on the server.
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
