import { useCallback } from 'react';
import * as planApi from '../../../shared/api/planApi';
import type {
  FeatureState,
  FeatureSummary,
} from '../../../shared/types/feature';

/**
 * Wraps the five per-field PATCH calls with an optimistic write pattern.
 *
 * Each editor calls the corresponding mutation; on success the server's
 * authoritative `FeatureSummary` replaces the local row via `onApplied`.
 * The `useInlineFieldEditor` hook owns the rollback path (re-throws so
 * the cell can flip to `error` status).
 *
 * Iter 1 skeleton: no optimistic pre-apply yet — the editor's `draft`
 * already carries the pending value visually, and the server response
 * arrives fast enough on dev. Phase B will add a pre-apply + rollback
 * pass on `features[]` so the segmented bar + DTR re-render before the
 * network returns.
 */
export interface OptimisticFeatureMutations {
  saveTitle: (featureId: number, nextTitle: string, version: number) => Promise<void>;
  saveDescription: (
    featureId: number,
    next: string | null,
    version: number,
  ) => Promise<void>;
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

  const saveDescription = useCallback<OptimisticFeatureMutations['saveDescription']>(
    async (featureId, next, version) => {
      const updated = await planApi.updateFeatureDescription(
        featureId,
        { description: next },
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

  return {
    saveTitle,
    saveDescription,
    saveStageOwner,
    saveStagePlannedStart,
    saveStagePlannedEnd,
  };
}
