import { useCallback, useEffect, useRef, useState } from 'react';
import * as planApi from '../../shared/api/planApi';
import type { FeatureScope, FeatureState, FeatureSummary } from '../../shared/types/feature';
import { useRefetchOnFocus } from '../../shared/hooks/useRefetchOnFocus';

export interface UsePlanFeaturesParams {
  scope?: FeatureScope;
  state?: FeatureState;
  /** Injection seam — defaults to `planApi.listFeatures`. */
  fetcher?: (params: { scope?: FeatureScope; state?: FeatureState }) => Promise<FeatureSummary[]>;
}

export interface UsePlanFeaturesResult {
  data: FeatureSummary[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
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

const featuresCache = new Map<string, FeatureSummary[]>();
const inFlight = new Map<string, Promise<FeatureSummary[]>>();

/**
 * Test helper — clears the module-level cache so each test starts clean.
 * Not exported from any barrel; import directly from this file.
 */
export function __resetPlanFeaturesCache(): void {
  featuresCache.clear();
  inFlight.clear();
}

export function usePlanFeatures(params: UsePlanFeaturesParams): UsePlanFeaturesResult {
  const { scope, state, fetcher = planApi.listFeatures } = params;
  const key = cacheKey({ scope, state });
  const [data, setData] = useState<FeatureSummary[] | null>(() => featuresCache.get(key) ?? null);
  const [loading, setLoading] = useState<boolean>(() => !featuresCache.has(key));
  const [error, setError] = useState<Error | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);
  const [trackedKey, setTrackedKey] = useState<string>(key);
  const activeKeyRef = useRef<string>(key);

  // Resync state during render when the cache key changes. This is the
  // React-idiomatic "adjusting state while rendering" pattern and avoids
  // an in-effect setState (which the React Compiler lint flags as a
  // cascading-render risk).
  if (trackedKey !== key) {
    setTrackedKey(key);
    const cached = featuresCache.get(key);
    setData(cached ?? null);
    setLoading(!cached);
    setError(null);
  }

  const refetch = useCallback(() => {
    featuresCache.delete(key);
    inFlight.delete(key);
    setRefetchToken((n) => n + 1);
  }, [key]);

  useEffect(() => {
    activeKeyRef.current = key;
    const cached = featuresCache.get(key);
    if (cached) {
      // Already hydrated from cache during render (above). No-op here.
      return;
    }

    let cancelled = false;

    const existing = inFlight.get(key);
    const promise = existing ?? fetcher({ scope, state });
    if (!existing) inFlight.set(key, promise);

    promise
      .then((rows) => {
        if (cancelled || activeKeyRef.current !== key) return;
        featuresCache.set(key, rows);
        setData(rows);
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
  }, [key, scope, state, fetcher, refetchToken]);

  useRefetchOnFocus(error != null, refetch, loading);

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
        // Keep the module cache in sync so a remount doesn't re-hydrate
        // with the stale row.
        const cached = featuresCache.get(key);
        if (cached) {
          featuresCache.set(
            key,
            cached.map((row) => (row.id === next.id ? next : row)),
          );
        }
        return replaced;
      });
    },
    [key],
  );

  return { data, loading, error, refetch, applyFeatureUpdate };
}
