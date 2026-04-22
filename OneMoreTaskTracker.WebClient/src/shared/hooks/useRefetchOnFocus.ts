import { useEffect } from 'react';

/**
 * Re-run `refetch` when the window regains focus, but only while `enabled` is
 * true and not while a refetch is already in-flight.
 *
 * Typical usage: async resource hooks pass `enabled: error != null` so the
 * stale error banner clears itself as soon as the user Cmd+Tabs back after
 * services recover — no full page reload required.
 *
 * The `inFlight` guard prevents a burst of focus events (common on alt-tab
 * spam) from cancelling their own in-flight retry, since most ad-hoc refetch
 * implementations drop any pending promise when called.
 */
export function useRefetchOnFocus(
  enabled: boolean,
  refetch: () => void,
  inFlight: boolean = false,
): void {
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      if (!inFlight) refetch();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, inFlight, refetch]);
}
