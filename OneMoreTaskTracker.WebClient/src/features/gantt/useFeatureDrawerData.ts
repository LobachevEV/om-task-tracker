import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeatureDetail } from '../../shared/types/feature';
import * as planApi from '../../shared/api/planApi';

export interface FeatureDrawerDataState {
  data: FeatureDetail | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Owns the single fetch of a feature for the drawer. Cancels in-flight requests
 * via AbortController when the id changes or the caller unmounts.
 */
export function useFeatureDrawerData(featureId: number | null): FeatureDrawerDataState {
  const [data, setData] = useState<FeatureDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(featureId != null);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);
  const [trackedFeatureId, setTrackedFeatureId] = useState<number | null>(featureId);
  const abortRef = useRef<AbortController | null>(null);

  // Derive state during render when featureId transitions (drawer close or
  // switch to a different feature). Avoids setState-in-effect which the
  // React Compiler lint flags as a cascading-render risk.
  if (featureId == null && trackedFeatureId != null) {
    setTrackedFeatureId(null);
    setData(null);
    setLoading(false);
    setError(null);
  } else if (featureId != null && trackedFeatureId !== featureId) {
    setTrackedFeatureId(featureId);
    setData(null);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    if (featureId == null) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    planApi
      .getFeature(featureId)
      .then((detail) => {
        if (controller.signal.aborted) return;
        setData(detail);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [featureId, refetchCounter]);

  const refetch = useCallback(() => {
    setRefetchCounter((n) => n + 1);
  }, []);

  return { data, loading, error, refetch };
}
