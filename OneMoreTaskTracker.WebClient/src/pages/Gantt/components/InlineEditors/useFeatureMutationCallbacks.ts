import { useCallback, useMemo } from 'react';
import * as planApi from '../../../../common/api/planApi';
import type {
  FeatureState,
  FeatureSummary,
  PatchFeaturePayload,
} from '../../../../common/types/feature';

export interface FeatureMutationCallbacks {
  saveTitle: (featureId: number, nextTitle: string, version: number) => Promise<void>;
  saveLead: (featureId: number, next: number, version: number) => Promise<void>;
  saveStageOwner: (
    featureId: number,
    stage: FeatureState,
    next: number | null,
    version: number,
  ) => Promise<void>;
  saveStagePlannedStart: (
    featureId: number,
    stage: FeatureState,
    next: string | null,
    version: number,
  ) => Promise<void>;
  saveStagePlannedEnd: (
    featureId: number,
    stage: FeatureState,
    next: string | null,
    version: number,
  ) => Promise<void>;
}

export interface UseFeatureMutationCallbacksOptions {
  /** Called with the authoritative server summary on success. */
  onApplied: (next: FeatureSummary) => void;
}

type StageOwnerKey = keyof Pick<
  PatchFeaturePayload,
  | 'csApprovingOwnerUserId'
  | 'developmentOwnerUserId'
  | 'testingOwnerUserId'
  | 'ethalonTestingOwnerUserId'
  | 'liveReleaseOwnerUserId'
>;

type StagePlannedStartKey = keyof Pick<
  PatchFeaturePayload,
  | 'csApprovingPlannedStart'
  | 'developmentPlannedStart'
  | 'testingPlannedStart'
  | 'ethalonTestingPlannedStart'
  | 'liveReleasePlannedStart'
>;

type StagePlannedEndKey = keyof Pick<
  PatchFeaturePayload,
  | 'csApprovingPlannedEnd'
  | 'developmentPlannedEnd'
  | 'testingPlannedEnd'
  | 'ethalonTestingPlannedEnd'
  | 'liveReleasePlannedEnd'
>;

const STAGE_OWNER_KEY: Record<FeatureState, StageOwnerKey> = {
  CsApproving:    'csApprovingOwnerUserId',
  Development:    'developmentOwnerUserId',
  Testing:        'testingOwnerUserId',
  EthalonTesting: 'ethalonTestingOwnerUserId',
  LiveRelease:    'liveReleaseOwnerUserId',
};

const STAGE_PLANNED_START_KEY: Record<FeatureState, StagePlannedStartKey> = {
  CsApproving:    'csApprovingPlannedStart',
  Development:    'developmentPlannedStart',
  Testing:        'testingPlannedStart',
  EthalonTesting: 'ethalonTestingPlannedStart',
  LiveRelease:    'liveReleasePlannedStart',
};

const STAGE_PLANNED_END_KEY: Record<FeatureState, StagePlannedEndKey> = {
  CsApproving:    'csApprovingPlannedEnd',
  Development:    'developmentPlannedEnd',
  Testing:        'testingPlannedEnd',
  EthalonTesting: 'ethalonTestingPlannedEnd',
  LiveRelease:    'liveReleasePlannedEnd',
};

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

  const saveStageOwner = useCallback<FeatureMutationCallbacks['saveStageOwner']>(
    async (featureId, stage, next, version) => {
      const updated = await planApi.patchFeature(featureId, {
        [STAGE_OWNER_KEY[stage]]: next,
        expectedVersion: version,
      });
      onApplied(updated);
    },
    [onApplied],
  );

  const saveStagePlannedStart = useCallback<
    FeatureMutationCallbacks['saveStagePlannedStart']
  >(
    async (featureId, stage, next, version) => {
      const updated = await planApi.patchFeature(featureId, {
        [STAGE_PLANNED_START_KEY[stage]]: next,
        expectedVersion: version,
      });
      onApplied(updated);
    },
    [onApplied],
  );

  const saveStagePlannedEnd = useCallback<
    FeatureMutationCallbacks['saveStagePlannedEnd']
  >(
    async (featureId, stage, next, version) => {
      const updated = await planApi.patchFeature(featureId, {
        [STAGE_PLANNED_END_KEY[stage]]: next,
        expectedVersion: version,
      });
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
