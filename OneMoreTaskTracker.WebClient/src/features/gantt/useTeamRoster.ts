import { useCallback, useEffect, useState } from 'react';
import * as teamApi from '../../shared/api/teamApi';
import type { TeamRosterMember } from '../../shared/api/teamApi';
import { useRefetchOnFocus } from '../../shared/hooks/useRefetchOnFocus';

export interface UseTeamRosterResult {
  data: TeamRosterMember[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseTeamRosterOptions {
  /** Injection seam — defaults to `teamApi.getRoster`. */
  fetcher?: () => Promise<TeamRosterMember[]>;
}

/**
 * Module-singleton cache so two mounts of `<GanttPage/>` (or any consumer)
 * share one in-flight request and one cached roster. Kept internal: reset
 * only via the test helper below; refetch() drops both slots explicitly.
 */
const rosterStore: {
  data: TeamRosterMember[] | null;
  inflight: Promise<TeamRosterMember[]> | null;
} = { data: null, inflight: null };

/** Test-only. Restores `rosterStore` to pristine state between tests. */
export function __resetTeamRosterCache(): void {
  rosterStore.data = null;
  rosterStore.inflight = null;
}

export function useTeamRoster(options: UseTeamRosterOptions = {}): UseTeamRosterResult {
  const { fetcher = teamApi.getRoster } = options;
  const [data, setData] = useState<TeamRosterMember[] | null>(() => rosterStore.data);
  const [loading, setLoading] = useState<boolean>(() => rosterStore.data == null);
  const [error, setError] = useState<Error | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => {
    rosterStore.data = null;
    rosterStore.inflight = null;
    setRefetchToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (rosterStore.data) {
      setData(rosterStore.data);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const promise = rosterStore.inflight ?? fetcher();
    rosterStore.inflight = promise;
    promise
      .then((rows) => {
        if (cancelled) return;
        rosterStore.data = rows;
        setData(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      })
      .finally(() => {
        if (rosterStore.inflight === promise) rosterStore.inflight = null;
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, refetchToken]);

  // Auto-recover from a stale error banner when the tab regains focus —
  // covers "services were down at page load, now they're back."
  useRefetchOnFocus(error != null, refetch, loading);

  return { data, loading, error, refetch };
}
