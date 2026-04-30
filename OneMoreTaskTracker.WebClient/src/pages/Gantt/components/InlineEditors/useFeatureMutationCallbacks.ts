import { useCallback, useMemo } from 'react';
import * as planApi from '../../../../common/api/planApi';
import type {
  FeatureSummary,
  GateKey,
  GateStatus,
  PhaseKind,
  Track,
} from '../../../../common/types/feature';

export interface FeatureMutationCallbacks {
  saveTitle: (featureId: number, nextTitle: string, version: number) => Promise<void>;
  saveLead: (featureId: number, next: number, version: number) => Promise<void>;
  saveGateStatus: (
    featureId: number,
    gateKey: GateKey,
    next: GateStatus,
    rejectionReason: string | null,
    gateVersion: number,
  ) => Promise<void>;
  saveSubStageOwner: (
    featureId: number,
    subStageId: number,
    next: number | null,
    subStageVersion: number,
  ) => Promise<void>;
  saveSubStagePlannedStart: (
    featureId: number,
    subStageId: number,
    next: string | null,
    subStageVersion: number,
  ) => Promise<void>;
  saveSubStagePlannedEnd: (
    featureId: number,
    subStageId: number,
    next: string | null,
    subStageVersion: number,
  ) => Promise<void>;
  appendSubStage: (
    featureId: number,
    track: Track,
    phase: PhaseKind,
  ) => Promise<number | null>;
  removeSubStage: (
    featureId: number,
    subStageId: number,
    subStageVersion: number,
  ) => Promise<void>;
}

export interface UseFeatureMutationCallbacksOptions {
  /** Called with the authoritative server summary on success. */
  onApplied: (next: FeatureSummary) => void;
  /**
   * The latest cached features keyed by id; used to merge taxonomy-only
   * responses into a full FeatureSummary before invoking onApplied.
   */
  resolveFeature: (featureId: number) => FeatureSummary | undefined;
}

function applyTaxonomy(
  base: FeatureSummary,
  featureVersion: number,
  taxonomy: FeatureSummary['taxonomy'],
): FeatureSummary {
  return { ...base, version: featureVersion, taxonomy };
}

export function useFeatureMutationCallbacks(
  options: UseFeatureMutationCallbacksOptions,
): FeatureMutationCallbacks {
  const { onApplied, resolveFeature } = options;

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

  const saveGateStatus = useCallback<FeatureMutationCallbacks['saveGateStatus']>(
    async (featureId, gateKey, next, rejectionReason, gateVersion) => {
      const response = await planApi.patchFeatureGate(featureId, gateKey, {
        status: next,
        rejectionReason: next === 'rejected' ? rejectionReason : null,
        expectedVersion: gateVersion,
      });
      const base = resolveFeature(featureId);
      if (base == null) return;
      onApplied(applyTaxonomy(base, response.featureVersion, response.taxonomy));
    },
    [onApplied, resolveFeature],
  );

  const saveSubStageOwner = useCallback<FeatureMutationCallbacks['saveSubStageOwner']>(
    async (featureId, subStageId, next, subStageVersion) => {
      const response = await planApi.patchFeatureSubStage(featureId, subStageId, {
        ownerUserId: next,
        expectedVersion: subStageVersion,
      });
      const base = resolveFeature(featureId);
      if (base == null) return;
      onApplied(applyTaxonomy(base, response.featureVersion, response.taxonomy));
    },
    [onApplied, resolveFeature],
  );

  const saveSubStagePlannedStart = useCallback<
    FeatureMutationCallbacks['saveSubStagePlannedStart']
  >(
    async (featureId, subStageId, next, subStageVersion) => {
      const response = await planApi.patchFeatureSubStage(featureId, subStageId, {
        plannedStart: next,
        expectedVersion: subStageVersion,
      });
      const base = resolveFeature(featureId);
      if (base == null) return;
      onApplied(applyTaxonomy(base, response.featureVersion, response.taxonomy));
    },
    [onApplied, resolveFeature],
  );

  const saveSubStagePlannedEnd = useCallback<
    FeatureMutationCallbacks['saveSubStagePlannedEnd']
  >(
    async (featureId, subStageId, next, subStageVersion) => {
      const response = await planApi.patchFeatureSubStage(featureId, subStageId, {
        plannedEnd: next,
        expectedVersion: subStageVersion,
      });
      const base = resolveFeature(featureId);
      if (base == null) return;
      onApplied(applyTaxonomy(base, response.featureVersion, response.taxonomy));
    },
    [onApplied, resolveFeature],
  );

  const appendSubStage = useCallback<FeatureMutationCallbacks['appendSubStage']>(
    async (featureId, track, phase) => {
      const response = await planApi.appendFeatureSubStage(featureId, track, phase, {});
      const base = resolveFeature(featureId);
      if (base != null) {
        onApplied(applyTaxonomy(base, response.featureVersion, response.taxonomy));
      }
      return response.createdSubStageId ?? null;
    },
    [onApplied, resolveFeature],
  );

  const removeSubStage = useCallback<FeatureMutationCallbacks['removeSubStage']>(
    async (featureId, subStageId, subStageVersion) => {
      const response = await planApi.deleteFeatureSubStage(
        featureId,
        subStageId,
        subStageVersion,
      );
      const base = resolveFeature(featureId);
      if (base == null) return;
      onApplied(applyTaxonomy(base, response.featureVersion, response.taxonomy));
    },
    [onApplied, resolveFeature],
  );

  return useMemo(
    () => ({
      saveTitle,
      saveLead,
      saveGateStatus,
      saveSubStageOwner,
      saveSubStagePlannedStart,
      saveSubStagePlannedEnd,
      appendSubStage,
      removeSubStage,
    }),
    [
      saveTitle,
      saveLead,
      saveGateStatus,
      saveSubStageOwner,
      saveSubStagePlannedStart,
      saveSubStagePlannedEnd,
      appendSubStage,
      removeSubStage,
    ],
  );
}
