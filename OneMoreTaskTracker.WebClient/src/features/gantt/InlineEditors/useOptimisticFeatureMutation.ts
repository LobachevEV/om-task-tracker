import { useCallback, useMemo } from 'react';
import * as planApi from '../../../shared/api/planApi';
import type {
  FeatureState,
  FeatureSummary,
} from '../../../shared/types/feature';

export interface OptimisticFeatureMutations {
  saveTitle: (featureId: number, nextTitle: string, version: number) => Promise<void>;
  saveStageOwner: (
    featureId: number,
    stage: FeatureState,
    next: number | null,
    stageVersion: number,
  ) => Promise<void>;
  saveStagePlannedStart: (
    featureId: number,
    stage: FeatureState,
    next: string | null,
    stageVersion: number,
  ) => Promise<void>;
  saveStagePlannedEnd: (
    featureId: number,
    stage: FeatureState,
    next: string | null,
    stageVersion: number,
  ) => Promise<void>;
}

export interface UseOptimisticFeatureMutationOptions {
  /** Called with the authoritative server summary on success. */
  onApplied: (next: FeatureSummary) => void;
}

export function useOptimisticFeatureMutation(
  options: UseOptimisticFeatureMutationOptions,
): OptimisticFeatureMutations {
  const { onApplied } = options;

  const saveTitle = useCallback<OptimisticFeatureMutations['saveTitle']>(
    async (featureId, nextTitle, version) => {
      const updated = await planApi.updateFeatureTitle(
        featureId,
        { title: nextTitle },
        version,
      );
      onApplied(updated);
    },
    [onApplied],
  );

  const saveStageOwner = useCallback<OptimisticFeatureMutations['saveStageOwner']>(
    async (featureId, stage, next, stageVersion) => {
      const updated = await planApi.updateStageOwner(
        featureId,
        stage,
        { stageOwnerUserId: next },
        stageVersion,
      );
      onApplied(updated);
    },
    [onApplied],
  );

  const saveStagePlannedStart = useCallback<
    OptimisticFeatureMutations['saveStagePlannedStart']
  >(
    async (featureId, stage, next, stageVersion) => {
      const updated = await planApi.updateStagePlannedStart(
        featureId,
        stage,
        { plannedStart: next },
        stageVersion,
      );
      onApplied(updated);
    },
    [onApplied],
  );

  const saveStagePlannedEnd = useCallback<
    OptimisticFeatureMutations['saveStagePlannedEnd']
  >(
    async (featureId, stage, next, stageVersion) => {
      const updated = await planApi.updateStagePlannedEnd(
        featureId,
        stage,
        { plannedEnd: next },
        stageVersion,
      );
      onApplied(updated);
    },
    [onApplied],
  );

  return useMemo(
    () => ({
      saveTitle,
      saveStageOwner,
      saveStagePlannedStart,
      saveStagePlannedEnd,
    }),
    [saveTitle, saveStageOwner, saveStagePlannedStart, saveStagePlannedEnd],
  );
}
