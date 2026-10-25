"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { configureApiClient } from "@/lib/api-client";
import { sessionStore } from "@/lib/session";
import { authService } from "@/services/auth.service";
import type { User } from "@/types/domain";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const noopSubscribe = () => () => undefined;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // The session lives in an external store (localStorage + memory). Until the browser has hydrated
  // we can't know whether there is one, so the first render is "loading" and never mismatches the server.
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, () => null);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const status: AuthStatus = !hydrated ? "loading" : session ? "authenticated" : "anonymous";

  const signOut = useCallback(() => {
    sessionStore.clear();
    queryClient.clear(); // never show the previous user's data to the next one
  }, [queryClient]);

  // Tell the API client where the token is, and what to do when the server says the session is over.
  useEffect(() => {
    configureApiClient({
      getToken: () => sessionStore.get()?.token ?? null,
      onUnauthorized: () => {
        signOut();
        router.replace("/login?expired=1");
      },
    });
  }, [signOut, router]);

  // Once per page load, confirm a restored session with the server (a 401 is handled globally above).
  const verified = useRef(false);
  useEffect(() => {
    if (status !== "authenticated" || verified.current) return;
    verified.current = true;
    authService
      .me()
      .then((fresh) => {
        const saved = sessionStore.get();
        if (saved) sessionStore.set({ token: saved.token, user: fresh });
      })
      .catch(() => undefined); // network blips shouldn't log anyone out
  }, [status]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authService.login(email, password);
    sessionStore.set({ token, user });
    return user;
  }, []);

  const logout = useCallback(() => {
    signOut();
    router.replace("/login");
  }, [signOut, router]);

  const value = useMemo<AuthContextValue>(() => ({ user: session?.user ?? null, status, login, logout }), [session, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
