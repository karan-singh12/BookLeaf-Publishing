import { useSyncExternalStore } from "react";
import { POLL_INTERVAL_MS } from "@/lib/constants";

/** Tiny shared store: is the live event stream currently connected? */
let connected = false;
const listeners = new Set<() => void>();

export const setLiveConnected = (value: boolean): void => {
  if (connected === value) return;
  connected = value;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLiveConnected = (): boolean =>
  useSyncExternalStore(subscribe, () => connected, () => false);

/**
 * `refetchInterval` for ticket queries: nothing while the stream is delivering updates,
 * a gentle poll when it isn't (blocked network, server restart), so the UI never goes stale.
 */
export const useFallbackPolling = (): number | false => (useLiveConnected() ? false : POLL_INTERVAL_MS);
