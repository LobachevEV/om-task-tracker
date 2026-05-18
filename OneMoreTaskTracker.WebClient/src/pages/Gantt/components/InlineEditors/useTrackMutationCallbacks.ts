import { useCallback, useMemo } from 'react';
import * as planApi from '../../../../common/api/planApi';
import type { FeatureTrackKind, FeatureTrackStage, FeatureTrackStageKey, PatchFeatureTrackStagePayload } from '../../../../common/types/featureTrack';

/**
 * Returns the number of fields in `body` that the BE will actually apply.
 *
 * The gateway maps FE payload fields to proto Has* flags with two distinct
 * rules:
 * - `stageOwnerUserId`: uses Tristate — null (clear-owner) is still a
 *   present field that triggers `AssignOwner`. Counted when not undefined.
 * - `plannedStart` / `plannedEnd`: only set on the proto when non-null
 *   (gateway: `if (body.PlannedStart is { })`). Null means "omit from proto"
 *   and the BE setter is not called.
 *
 * `expectedStageVersion` is the optimistic-locking guard, not a mutation,
 * and is excluded from the count. The BE increments `stageVersion` once per
 * applied setter, so the FE optimistic bump must equal this count exactly.
 */
function countPatchFields(
  body: Omit<PatchFeatureTrackStagePayload, 'expectedStageVersion'>,
): number {
  let count = 0;
  if (body.stageOwnerUserId !== undefined) count += 1;
  if (body.plannedStart !== null && body.plannedStart !== undefined) count += 1;
  if (body.plannedEnd !== null && body.plannedEnd !== undefined) count += 1;
  return count;
}

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
  saveTrackStageRange: (
    featureId: number,
    kind: FeatureTrackKind,
    stageKey: FeatureTrackStageKey,
    range: { plannedStart: string | null; plannedEnd: string | null },
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
    patch: Partial<Pick<FeatureTrackStage, 'plannedStart' | 'plannedEnd' | 'stageOwnerUserId' | 'stageVersion'>>,
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
      const fields = { stageOwnerUserId: next };
      await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        ...fields,
        expectedStageVersion: stageVersion,
      });
      onStageApplied(featureId, kind, stageKey, {
        ...fields,
        stageVersion: stageVersion + countPatchFields(fields),
      });
    },
    [onStageApplied],
  );

  const saveTrackStagePlannedStart = useCallback<
    TrackMutationCallbacks['saveTrackStagePlannedStart']
  >(
    async (featureId, kind, stageKey, next, stageVersion) => {
      const fields = { plannedStart: next };
      await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        ...fields,
        expectedStageVersion: stageVersion,
      });
      onStageApplied(featureId, kind, stageKey, {
        ...fields,
        stageVersion: stageVersion + countPatchFields(fields),
      });
    },
    [onStageApplied],
  );

  const saveTrackStagePlannedEnd = useCallback<
    TrackMutationCallbacks['saveTrackStagePlannedEnd']
  >(
    async (featureId, kind, stageKey, next, stageVersion) => {
      const fields = { plannedEnd: next };
      await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        ...fields,
        expectedStageVersion: stageVersion,
      });
      onStageApplied(featureId, kind, stageKey, {
        ...fields,
        stageVersion: stageVersion + countPatchFields(fields),
      });
    },
    [onStageApplied],
  );

  const saveTrackStageRange = useCallback<TrackMutationCallbacks['saveTrackStageRange']>(
    async (featureId, kind, stageKey, range, stageVersion) => {
      const fields = { plannedStart: range.plannedStart, plannedEnd: range.plannedEnd };
      await planApi.patchFeatureTrackStage(featureId, kind, stageKey, {
        ...fields,
        expectedStageVersion: stageVersion,
      });
      onStageApplied(featureId, kind, stageKey, {
        ...fields,
        stageVersion: stageVersion + countPatchFields(fields),
      });
    },
    [onStageApplied],
  );

  return useMemo(
    () => ({
      saveTrackOwner,
      saveTrackStageOwner,
      saveTrackStagePlannedStart,
      saveTrackStagePlannedEnd,
      saveTrackStageRange,
    }),
    [
      saveTrackOwner,
      saveTrackStageOwner,
      saveTrackStagePlannedStart,
      saveTrackStagePlannedEnd,
      saveTrackStageRange,
    ],
  );
}
