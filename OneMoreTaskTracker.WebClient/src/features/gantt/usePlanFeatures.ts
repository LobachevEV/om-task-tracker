import { useCallback, useEffect, useRef, useState } from 'react';
import * as planApi from '../../shared/api/planApi';
import type { ListFeaturesParams } from '../../shared/api/planApi';
import type { FeatureScope, FeatureState, FeatureSummary } from '../../shared/types/feature';
import { useRefetchOnFocus } from '../../shared/hooks/useRefetchOnFocus';

export interface UsePlanFeaturesParams {
  scope?: FeatureScope;
  state?: FeatureState;
  /** Initial windowStart sent on the first auto-load (chunk fetches override per call). */
  initialWindowStart?: string;
  /** Initial windowEnd sent on the first auto-load. */
  initialWindowEnd?: string;
  /** Injection seam — defaults to `planApi.listFeatures`. */
  fetcher?: (params: ListFeaturesParams) => Promise<FeatureSummary[]>;
}

export interface ChunkFetchOptions {
  windowStart: string;
  windowEnd: string;
  /** Optional AbortSignal — caller cancels stale chunk fetches on fast pan. */
  signal?: AbortSignal;
}

export interface UsePlanFeaturesResult {
  data: FeatureSummary[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  /**
   * Fetch a date-window chunk and merge results into the cache. The cache
   * key is `scope|state` only — window is NOT part of the key, so each
   * chunk UPSERTs by feature id. Returns the rows from this chunk for
   * direct callers; the global `data` exposed by the hook reflects the
   * merged superset.
   */
  loadChunk: (opts: ChunkFetchOptions) => Promise<FeatureSummary[]>;
  /**
   * Replace a single row in the local feature list with the authoritative
   * `FeatureSummary` returned from a per-field inline-edit PATCH. The
   * module-level cache is updated in lockstep so a remount re-hydrates
   * with the new value.
   *
   * No-op when the id is not present — inline edits never add / remove
   * rows.
   */
  applyFeatureUpdate: (next: FeatureSummary) => void;
}

function cacheKey(params: { scope?: FeatureScope; state?: FeatureState }): string {
  return `${params.scope ?? '-'}|${params.state ?? '-'}`;
}

/**
 * Module-level cache. Outer key is `scope|state`; inner Map is keyed by
 * feature id. Chunk responses MERGE — they never overwrite the whole list.
 */
const featuresCache = new Map<string, Map<number, FeatureSummary>>();
const inFlight = new Map<string, Promise<FeatureSummary[]>>();

function snapshotList(key: string): FeatureSummary[] | null {
  const m = featuresCache.get(key);
  if (!m) return null;
  return Array.from(m.values());
}

function mergeChunkIntoCache(key: string, rows: FeatureSummary[]): FeatureSummary[] {
  const existing = featuresCache.get(key) ?? new Map<number, FeatureSummary>();
  for (const row of rows) {
    existing.set(row.id, row);
  }
  featuresCache.set(key, existing);
  return Array.from(existing.values());
}

/**
 * Test helper — clears the module-level cache so each test starts clean.
 * Not exported from any barrel; import directly from this file.
 */
export function __resetPlanFeaturesCache(): void {
  featuresCache.clear();
  inFlight.clear();
}

export function usePlanFeatures(params: UsePlanFeaturesParams): UsePlanFeaturesResult {
  const {
    scope,
    state,
    initialWindowStart,
    initialWindowEnd,
    fetcher = planApi.listFeatures,
  } = params;
  const key = cacheKey({ scope, state });
  const [data, setData] = useState<FeatureSummary[] | null>(() => snapshotList(key));
  const [loading, setLoading] = useState<boolean>(() => !featuresCache.has(key));
  const [error, setError] = useState<Error | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);
  const [trackedKey, setTrackedKey] = useState<string>(key);
  const activeKeyRef = useRef<string>(key);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Resync state during render when the cache key changes. This is the
  // React-idiomatic "adjusting state while rendering" pattern.
  if (trackedKey !== key) {
    setTrackedKey(key);
    const snap = snapshotList(key);
    setData(snap);
    setLoading(snap == null);
    setError(null);
  }

  const refetch = useCallback(() => {
    featuresCache.delete(key);
    inFlight.delete(key);
    setRefetchToken((n) => n + 1);
  }, [key]);

  useEffect(() => {
    activeKeyRef.current = key;
    const snap = snapshotList(key);
    if (snap) {
      // Already hydrated from cache during render. No-op.
      return;
    }

    let cancelled = false;

    const existing = inFlight.get(key);
    const promise =
      existing ??
      fetcherRef.current({
        scope,
        state,
        windowStart: initialWindowStart,
        windowEnd: initialWindowEnd,
      });
    if (!existing) inFlight.set(key, promise);

    promise
      .then((rows) => {
        if (cancelled || activeKeyRef.current !== key) return;
        const merged = mergeChunkIntoCache(key, rows);
        setData(merged);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || activeKeyRef.current !== key) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      })
      .finally(() => {
        if (inFlight.get(key) === promise) inFlight.delete(key);
      });

    return () => {
      cancelled = true;
    };
  }, [key, scope, state, initialWindowStart, initialWindowEnd, refetchToken]);

  useRefetchOnFocus(error != null, refetch, loading);

  const loadChunk = useCallback(
    async (opts: ChunkFetchOptions): Promise<FeatureSummary[]> => {
      const rows = await fetcherRef.current({
        scope,
        state,
        windowStart: opts.windowStart,
        windowEnd: opts.windowEnd,
        signal: opts.signal,
      });
      // Only merge if this hook still tracks the same scope/state — guards
      // against late-arriving responses for a now-stale scope.
      if (activeKeyRef.current === key) {
        const merged = mergeChunkIntoCache(key, rows);
        setData(merged);
      } else {
        mergeChunkIntoCache(key, rows);
      }
      return rows;
    },
    [key, scope, state],
  );

  const applyFeatureUpdate = useCallback(
    (next: FeatureSummary) => {
      setData((prev) => {
        if (!prev) return prev;
        let changed = false;
        const replaced = prev.map((row) => {
          if (row.id !== next.id) return row;
          changed = true;
          return next;
        });
        if (!changed) return prev;
        const cached = featuresCache.get(key);
        if (cached && cached.has(next.id)) {
          cached.set(next.id, next);
        }
        return replaced;
      });
    },
    [key],
  );

  return { data, loading, error, refetch, loadChunk, applyFeatureUpdate };
}
