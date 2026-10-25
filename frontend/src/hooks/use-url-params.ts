import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Read and update the page's query string. `update` merges a patch into the current params (an
 * undefined or empty value removes the key) and swaps the URL in place with `replace`, so
 * filtering doesn't fill the browser history with an entry per click.
 *
 * Components using this must sit inside a <Suspense> boundary (Next.js requirement for useSearchParams).
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { params, update };
}
