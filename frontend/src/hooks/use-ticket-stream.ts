import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiUrl, authHeader } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { setLiveConnected } from "./use-live-status";

const MAX_BACKOFF_MS = 15_000;

/**
 * Subscribes to the server's event stream and refreshes ticket data the moment something changes
 * (an admin replies, a status moves, a new ticket arrives), so nobody has to reload the page.
 *
 * The stream is read with `fetch` rather than `EventSource` because EventSource cannot send an
 * Authorization header, and credentials must never go in the URL. Events carry ids only; the
 * data itself is refetched through the normal authorised endpoints.
 */
export function useTicketStream(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const abort = new AbortController();
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.tickets });

    const connect = async () => {
      try {
        const response = await fetch(apiUrl("/realtime/stream"), {
          headers: { Accept: "text/event-stream", ...authHeader() },
          signal: abort.signal,
        });
        if (!response.ok || !response.body) throw new Error(`stream refused (${response.status})`);

        retry = 0;
        setLiveConnected(true);
        refresh(); // catch up on anything missed while disconnected

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          if (frames.some((frame) => frame.startsWith("event: ticket"))) refresh();
        }
      } catch {
        // dropped, refused or aborted: handled by the reconnect below
      } finally {
        setLiveConnected(false);
      }

      if (!abort.signal.aborted) {
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, MAX_BACKOFF_MS));
      }
    };

    // Start on the next tick, not synchronously. In development React mounts every effect twice
    // (mount, cleanup, mount); starting here would open a connection that is aborted a moment
    // later and shows up in the network tab as a failed request. A deferred start is cancelled
    // by that cleanup before it ever fires, so only the real connection is made.
    timer = setTimeout(connect, 0);
    return () => {
      abort.abort();
      clearTimeout(timer);
      setLiveConnected(false);
    };
  }, [enabled, queryClient]);
}
