import { useCallback, useMemo } from 'react';
import * as planApi from '../../../../common/api/planApi';
import type { FeatureTrackKind, FeatureTrackStage, FeatureTrackStageKey } from '../../../../common/types/featureTrack';

export interface TrackMutationCallbacks {
  saveTrackOwner: (
    featureId: number,
    kind: FeatureTrackKind,
    next: number,
    version: number,
  ) => Promise<void>;
  saveTrackStageOwner: (
    featureId: number,
    kind: FeatureTrackKind,
    stageKey: FeatureTrackStageKey,
    next: number | null,
    stageVersion: number,
  ) => Promise<void>;
  saveTrackStagePlannedStart: (
    featureId: number,
    kind: FeatureTrackKind,
    stageKey: FeatureTrackStageKey,
    next: string | null,
    stageVersion: number,
  ) => Promise<void>;
  saveTrackStagePlannedEnd: (
    featureId: number,
    kind: FeatureTrackKind,
    stageKey: FeatureTrackStageKey,
    next: string | null,
    stageVersion: number,
  ) => Promise<void>;
}

export interface UseTrackMutationCallbacksOptions {
  /**
   * Called after each successful track-stage PATCH (204 ack) with the
   * locally-known values so the store reflects the committed state without
   * waiting for a refetch.
   */
  onStageApplied: (
    featureId: number,
    kind: FeatureTrackKind,
    stageKey: FeatureTrackStageKey,
    patch: Partial<Pick<FeatureTrackStage, 'plannedStart' | 'plannedEnd' | 'stageOwnerUserId'>>,
  ) => void;
}

export function useTrackMutationCallbacks(
  opts: UseTrackMutationCallbacksOptions,
): TrackMutationCallbacks {
  const { onStageApplied } = opts;

  const saveTrackOwner = useCallback<TrackMutationCallbacks['saveTrackOwner']>(
    async (featureId, kind, next, version) => {
      await planApi.patchFeatureTrack(featureId, kind, {
        trackOwnerUserId: next,
        expectedVersion: version,
      });
    },
    [],
  );

  const saveTrackStageOwner = useCallback<TrackMutationCallbacks['saveTrackStageOwner']>(
    async (featureId, kind, stageKey, next, stageVersion) => {
      await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        stageOwnerUserId: next,
        expectedStageVersion: stageVersion,
      });
      onStageApplied(featureId, kind, stageKey, { stageOwnerUserId: next });
    },
    [onStageApplied],
  );

  const saveTrackStagePlannedStart = useCallback<
    TrackMutationCallbacks['saveTrackStagePlannedStart']
  >(
    async (featureId, kind, stageKey, next, stageVersion) => {
      await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        plannedStart: next,
        expectedStageVersion: stageVersion,
      });
      onStageApplied(featureId, kind, stageKey, { plannedStart: next });
    },
    [onStageApplied],
  );

  const saveTrackStagePlannedEnd = useCallback<
    TrackMutationCallbacks['saveTrackStagePlannedEnd']
  >(
    async (featureId, kind, stageKey, next, stageVersion) => {
      await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        plannedEnd: next,
        expectedStageVersion: stageVersion,
      });
      onStageApplied(featureId, kind, stageKey, { plannedEnd: next });
    },
    [onStageApplied],
  );

  return useMemo(
    () => ({
      saveTrackOwner,
      saveTrackStageOwner,
      saveTrackStagePlannedStart,
      saveTrackStagePlannedEnd,
    }),
    [saveTrackOwner, saveTrackStageOwner, saveTrackStagePlannedStart, saveTrackStagePlannedEnd],
  );
}
