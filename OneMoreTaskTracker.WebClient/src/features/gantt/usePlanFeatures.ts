import { useCallback, useEffect, useRef, useState } from 'react';
import * as planApi from '../../shared/api/planApi';
import type { FeatureScope, FeatureState, FeatureSummary } from '../../shared/types/feature';

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
  const activeKeyRef = useRef<string>(key);

  const refetch = useCallback(() => {
    featuresCache.delete(key);
    inFlight.delete(key);
    setRefetchToken((n) => n + 1);
  }, [key]);

  useEffect(() => {
    activeKeyRef.current = key;
    const cached = featuresCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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

  return { data, loading, error, refetch };
}
