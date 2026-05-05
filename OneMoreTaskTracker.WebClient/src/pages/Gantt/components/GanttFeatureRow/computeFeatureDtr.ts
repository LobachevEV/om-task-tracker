import type { FeatureSummary } from '../../../../common/types/feature';
import type { FeatureBarGeometry } from '../../ganttStageGeometry';
import { daysBetween } from '../../ganttMath';

export function computeFeatureDtr(
  geometry: FeatureBarGeometry,
  feature: FeatureSummary,
  today: string,
  doneLabel: string,
): string {
  if (feature.state === 'LiveRelease') return doneLabel;
  let plannedEnd: string | null = null;
  for (const t of geometry.tracks) {
    for (const phase of t.phases) {
      if (phase.derivedPlannedEnd != null) {
        if (plannedEnd == null || phase.derivedPlannedEnd > plannedEnd) {
          plannedEnd = phase.derivedPlannedEnd;
        }
      }
    }
  }
  if (plannedEnd == null) return '—';
  const delta = daysBetween(today, plannedEnd);
  if (delta < 0) return `-${Math.abs(delta)}d`;
  return `${delta}d`;
}
