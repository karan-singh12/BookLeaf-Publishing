import type { User } from "@/types/domain";

const KEY = "bookleaf.session";

export interface Session {
  token: string;
  user: User;
}

/**
 * The signed-in session as a tiny external store, so React can read it with `useSyncExternalStore`
 * (the right tool for state that lives outside React) and every tab-local change re-renders subscribers.
 *
 * It is persisted to localStorage but also held in memory, so the session still works for the
 * current tab when storage is unavailable (private windows, blocked site data). Trade-off, noted
 * in the README: localStorage is readable by injected scripts; an httpOnly cookie would not be,
 * but needs a same-site deployment and CSRF protection.
 */
let current: Session | null = null;
let loaded = false;
const listeners = new Set<() => void>();

const load = (): void => {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    current = null;
  }
};

const emit = () => listeners.forEach((listener) => listener());

export const sessionStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Stable between changes (same object), as `useSyncExternalStore` requires. */
  get(): Session | null {
    load();
    return current;
  },

  set(session: Session): void {
    loaded = true;
    current = session;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      // keep going with the in-memory session
    }
    emit();
  },

  clear(): void {
    loaded = true;
    current = null;
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // nothing to clear
    }
    emit();
  },
};
