import { useCallback, useEffect, useRef, useState } from 'react';
import * as planApi from '../../shared/api/planApi';
import type { FeatureBounds } from '../../shared/types/feature';
import { useRefetchOnFocus } from '../../shared/hooks/useRefetchOnFocus';

export interface UseFeatureBoundsParams {
  /** Injection seam — defaults to `planApi.getFeatureBounds`. */
  fetcher?: (opts?: { signal?: AbortSignal }) => Promise<FeatureBounds>;
}

export interface UseFeatureBoundsResult {
  bounds: FeatureBounds | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  /** Force a re-fetch on next mount; safe to call after a date PATCH. */
  invalidate: () => void;
}

const CACHE_KEY = 'singleton';
const cache = new Map<string, FeatureBounds>();
const inFlight = new Map<string, Promise<FeatureBounds>>();

/**
 * Test helper — clears the module-level cache so each test starts clean.
 */
export function __resetFeatureBoundsCache(): void {
  cache.clear();
  inFlight.clear();
}

export function useFeatureBounds(params: UseFeatureBoundsParams = {}): UseFeatureBoundsResult {
  const { fetcher = planApi.getFeatureBounds } = params;
  const [bounds, setBounds] = useState<FeatureBounds | null>(
    () => cache.get(CACHE_KEY) ?? null,
  );
  const [loading, setLoading] = useState<boolean>(() => !cache.has(CACHE_KEY));
  const [error, setError] = useState<Error | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refetch = useCallback(() => {
    cache.delete(CACHE_KEY);
    inFlight.delete(CACHE_KEY);
    setLoading(true);
    setError(null);
    setRefetchToken((n) => n + 1);
  }, []);

  const invalidate = useCallback(() => {
    cache.delete(CACHE_KEY);
    inFlight.delete(CACHE_KEY);
    setLoading(true);
    setRefetchToken((n) => n + 1);
  }, []);

  // Render-time cache hydration. The React-idiomatic alternative to
  // setState-in-effect — when a remount finds a value already in the
  // module-level cache (e.g. another consumer populated it), seed local
  // state during this render so the consumer doesn't paint a stale `null`.
  const cached = cache.get(CACHE_KEY);
  if (cached && bounds == null && refetchToken === 0) {
    setBounds(cached);
    if (loading) setLoading(false);
  }

  useEffect(() => {
    if (cache.has(CACHE_KEY) && refetchToken === 0) return;

    let cancelled = false;
    const existing = inFlight.get(CACHE_KEY);
    const promise = existing ?? fetcherRef.current();
    if (!existing) inFlight.set(CACHE_KEY, promise);

    promise
      .then((value) => {
        if (cancelled) return;
        cache.set(CACHE_KEY, value);
        setBounds(value);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      })
      .finally(() => {
        if (inFlight.get(CACHE_KEY) === promise) inFlight.delete(CACHE_KEY);
      });

    return () => {
      cancelled = true;
      if (inFlight.get(CACHE_KEY) === promise) inFlight.delete(CACHE_KEY);
    };
  }, [refetchToken, fetcher]);

  useRefetchOnFocus(error != null, refetch, loading);

  return { bounds, loading, error, refetch, invalidate };
}
