import { useCallback, useEffect, useState } from 'react';
import * as teamApi from '../../shared/api/teamApi';
import type { TeamRosterMember } from '../../shared/api/teamApi';

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

let rosterCache: TeamRosterMember[] | null = null;
let rosterInflight: Promise<TeamRosterMember[]> | null = null;

export function __resetTeamRosterCache(): void {
  rosterCache = null;
  rosterInflight = null;
}

export function useTeamRoster(options: UseTeamRosterOptions = {}): UseTeamRosterResult {
  const { fetcher = teamApi.getRoster } = options;
  const [data, setData] = useState<TeamRosterMember[] | null>(() => rosterCache);
  const [loading, setLoading] = useState<boolean>(() => rosterCache == null);
  const [error, setError] = useState<Error | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => {
    rosterCache = null;
    rosterInflight = null;
    setRefetchToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (rosterCache) {
      setData(rosterCache);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const promise = rosterInflight ?? fetcher();
    rosterInflight = promise;
    promise
      .then((rows) => {
        if (cancelled) return;
        rosterCache = rows;
        setData(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      })
      .finally(() => {
        if (rosterInflight === promise) rosterInflight = null;
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, refetchToken]);

  return { data, loading, error, refetch };
}
