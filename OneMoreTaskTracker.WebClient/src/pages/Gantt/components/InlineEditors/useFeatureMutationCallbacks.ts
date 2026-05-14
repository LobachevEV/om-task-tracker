import { useCallback, useMemo } from 'react';
import * as planApi from '../../../../common/api/planApi';
import type { FeatureSummary } from '../../../../common/types/feature';

export interface FeatureMutationCallbacks {
  saveTitle: (featureId: number, nextTitle: string, version: number) => Promise<void>;
  saveLead: (featureId: number, next: number, version: number) => Promise<void>;
}

export interface UseFeatureMutationCallbacksOptions {
  /** Called with the authoritative server summary on success. */
  onApplied: (next: FeatureSummary) => void;
}

export function useFeatureMutationCallbacks(
  options: UseFeatureMutationCallbacksOptions,
): FeatureMutationCallbacks {
  const { onApplied } = options;

  const saveTitle = useCallback<FeatureMutationCallbacks['saveTitle']>(
    async (featureId, nextTitle, version) => {
      const updated = await planApi.patchFeature(featureId, {
        title: nextTitle,
        expectedVersion: version,
      });
      onApplied(updated);
    },
    [onApplied],
  );

  const saveLead = useCallback<FeatureMutationCallbacks['saveLead']>(
    async (featureId, next, version) => {
      const updated = await planApi.patchFeature(featureId, {
        leadUserId: next,
        expectedVersion: version,
      });
      onApplied(updated);
    },
    [onApplied],
  );

  return useMemo(
    () => ({ saveTitle, saveLead }),
    [saveTitle, saveLead],
  );
}
