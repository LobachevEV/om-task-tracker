import { useCallback, useMemo } from 'react';
import * as planApi from '../../../../common/api/planApi';
import type {
  FeatureState,
  FeatureSummary,
} from '../../../../common/types/feature';

export interface FeatureMutationCallbacks {
  saveTitle: (featureId: number, nextTitle: string, version: number) => Promise<void>;
  saveLead: (featureId: number, next: number, version: number) => Promise<void>;
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
      const updated = await planApi.updateFeatureTitle(
        featureId,
        { title: nextTitle },
        version,
      );
      onApplied(updated);
    },
    [onApplied],
  );

  const saveLead = useCallback<FeatureMutationCallbacks['saveLead']>(
    async (featureId, next, version) => {
      const updated = await planApi.updateFeatureLead(
        featureId,
        { leadUserId: next },
        version,
      );
      onApplied(updated);
    },
    [onApplied],
  );

  const saveStageOwner = useCallback<FeatureMutationCallbacks['saveStageOwner']>(
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
    FeatureMutationCallbacks['saveStagePlannedStart']
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
    FeatureMutationCallbacks['saveStagePlannedEnd']
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
      saveLead,
      saveStageOwner,
      saveStagePlannedStart,
      saveStagePlannedEnd,
    }),
    [saveTitle, saveLead, saveStageOwner, saveStagePlannedStart, saveStagePlannedEnd],
  );
}
