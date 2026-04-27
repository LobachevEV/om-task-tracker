import { useCallback, useEffect, useReducer } from 'react';
import * as teamApi from '../../common/api/teamApi';
import type { TeamRosterMember } from '../../common/api/teamApi';
import { useRefetchOnFocus } from '../../common/hooks/useRefetchOnFocus';

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

/**
 * Discriminated async state: invalid combinations (e.g. loading + error)
 * are unrepresentable. `fetchId` increments on every refetch so the
 * effect can re-run without a separate token useState.
 */
type RosterState =
  | { status: 'loading'; data: TeamRosterMember[] | null; fetchId: number }
  | { status: 'success'; data: TeamRosterMember[]; fetchId: number }
  | { status: 'error'; data: TeamRosterMember[] | null; error: Error; fetchId: number };

type RosterAction =
  | { type: 'fetch.start' }
  | { type: 'fetch.success'; data: TeamRosterMember[] }
  | { type: 'fetch.error'; error: Error };

function rosterReducer(state: RosterState, action: RosterAction): RosterState {
  switch (action.type) {
    case 'fetch.start':
      return { status: 'loading', data: state.data, fetchId: state.fetchId + 1 };
    case 'fetch.success':
      return { status: 'success', data: action.data, fetchId: state.fetchId };
    case 'fetch.error':
      return {
        status: 'error',
        data: state.data,
        error: action.error,
        fetchId: state.fetchId,
      };
  }
}

function initialState(): RosterState {
  return rosterStore.data
    ? { status: 'success', data: rosterStore.data, fetchId: 0 }
    : { status: 'loading', data: null, fetchId: 0 };
}

export function useTeamRoster(options: UseTeamRosterOptions = {}): UseTeamRosterResult {
  const { fetcher = teamApi.getRoster } = options;
  const [state, dispatch] = useReducer(rosterReducer, undefined, initialState);

  const refetch = useCallback(() => {
    rosterStore.data = null;
    rosterStore.inflight = null;
    dispatch({ type: 'fetch.start' });
  }, []);

  useEffect(() => {
    // Cache hit after a remount — sync reducer state without a network call.
    if (rosterStore.data) {
      dispatch({ type: 'fetch.success', data: rosterStore.data });
      return;
    }

    let cancelled = false;
    const promise = rosterStore.inflight ?? fetcher();
    rosterStore.inflight = promise;
    promise
      .then((rows) => {
        if (cancelled) return;
        rosterStore.data = rows;
        dispatch({ type: 'fetch.success', data: rows });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        dispatch({
          type: 'fetch.error',
          error: err instanceof Error ? err : new Error(String(err)),
        });
      })
      .finally(() => {
        if (rosterStore.inflight === promise) rosterStore.inflight = null;
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, state.fetchId]);

  // Auto-recover from a stale error banner when the tab regains focus —
  // covers "services were down at page load, now they're back."
  useRefetchOnFocus(state.status === 'error', refetch, state.status === 'loading');

  return {
    data: state.data,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    refetch,
  };
}
