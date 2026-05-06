import { useCallback, useMemo } from 'react';
import * as planApi from '../../../../common/api/planApi';
import type { FeatureTrack } from '../../../../common/types/featureTrack';
import type { FeatureTrackKind, FeatureTrackStageKey } from '../../../../common/types/featureTrack';

export interface TrackMutationCallbacks {
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
  onTrackApplied: (featureId: number, next: FeatureTrack) => void;
}

export function useTrackMutationCallbacks(
  options: UseTrackMutationCallbacksOptions,
): TrackMutationCallbacks {
  const { onTrackApplied } = options;

  const saveTrackStageOwner = useCallback<TrackMutationCallbacks['saveTrackStageOwner']>(
    async (featureId, kind, stageKey, next, stageVersion) => {
      const updated = await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        stageOwnerUserId: next,
        expectedStageVersion: stageVersion,
      });
      onTrackApplied(featureId, updated);
    },
    [onTrackApplied],
  );

  const saveTrackStagePlannedStart = useCallback<
    TrackMutationCallbacks['saveTrackStagePlannedStart']
  >(
    async (featureId, kind, stageKey, next, stageVersion) => {
      const updated = await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        plannedStart: next,
        expectedStageVersion: stageVersion,
      });
      onTrackApplied(featureId, updated);
    },
    [onTrackApplied],
  );

  const saveTrackStagePlannedEnd = useCallback<
    TrackMutationCallbacks['saveTrackStagePlannedEnd']
  >(
    async (featureId, kind, stageKey, next, stageVersion) => {
      const updated = await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        plannedEnd: next,
        expectedStageVersion: stageVersion,
      });
      onTrackApplied(featureId, updated);
    },
    [onTrackApplied],
  );

  return useMemo(
    () => ({
      saveTrackStageOwner,
      saveTrackStagePlannedStart,
      saveTrackStagePlannedEnd,
    }),
    [saveTrackStageOwner, saveTrackStagePlannedStart, saveTrackStagePlannedEnd],
  );
}
