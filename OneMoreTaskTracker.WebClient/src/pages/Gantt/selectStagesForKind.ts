import {
  FRONTEND_STAGE_KEYS,
  BACKEND_STAGE_KEYS,
  type FeatureTrackKind,
  type FeatureTrackStage,
} from '../../common/types/featureTrack';

/**
 * Returns only the stages whose stageKey belongs to the allowed set for the given track kind.
 * Filters out any stale or extra stages the server may have returned.
 */
export function selectStagesForKind(
  stages: readonly FeatureTrackStage[],
  kind: FeatureTrackKind,
): FeatureTrackStage[] {
  const allowed: readonly string[] =
    kind === 'Frontend' ? FRONTEND_STAGE_KEYS : BACKEND_STAGE_KEYS;
  return stages.filter((s) => (allowed as string[]).includes(s.stageKey));
}
