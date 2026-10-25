import { useEffect, useState } from "react";

/** Returns `value` after it has stopped changing for `delayMs`; used so typing in search doesn't fire a request per key. */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
