import { useMemo } from 'react';
import type { FeatureSummary } from '../../shared/types/feature';
import {
  barGeometryPx,
  dateToPixel,
  daysBetween,
  type BarGeometryPx,
  type DateWindow,
} from './ganttMath';
import { computeStageBars, type StageBarGeometry } from './ganttStageGeometry';

export type GanttLaneVariant = 'planned' | 'noPlan';

export interface GanttLane {
  feature: FeatureSummary;
  /**
   * Summary-bar geometry (px-based against `loadedRange.start`). Null when the
   * feature has no derivable plan inside the loaded range. The row still
   * renders as a ghost lane so the manager can see "this feature exists but
   * has no plan yet" without it silently disappearing.
   */
  bar: BarGeometryPx | null;
  /** Per-stage geometry, always length 5 (one per FEATURE_STATES entry). */
  stageBars: StageBarGeometry[];
  /**
   * Why the feature is rendered the way it is:
   *  - `planned` → bar fits inside the loaded range, render normally.
   *  - `noPlan`  → no stagePlan has any date; render a ghost summary bar
   *                labelled "Not planned yet".
   */
  variant: GanttLaneVariant;
}

export interface GanttLayout {
  loadedRange: DateWindow;
  lanes: GanttLane[];
  /** Features with no plan rows yet (legacy or freshly-created). */
  unscheduled: FeatureSummary[];
  /** Px offset of `today` from `loadedRange.start`. Null when today is outside the loaded range. */
  todayPx: number | null;
  /** Total px width of the date axis ( = daysBetween(start, end) * dayPx ). */
  totalWidthPx: number;
}

export interface UseGanttLayoutArgs {
  features: FeatureSummary[];
  today: string;
  loadedRange: DateWindow;
  dayPx: number;
}

function featureHasAnyPlannedDate(feature: FeatureSummary): boolean {
  if (feature.plannedStart != null || feature.plannedEnd != null) return true;
  return feature.stagePlans.some(
    (p) => p.plannedStart != null || p.plannedEnd != null,
  );
}

function planOverlapsRange(
  feature: FeatureSummary,
  range: DateWindow,
): boolean {
  if (feature.plannedStart == null && feature.plannedEnd == null) return false;
  const start = feature.plannedStart ?? feature.plannedEnd!;
  const end = feature.plannedEnd ?? feature.plannedStart!;
  // half-open range: [range.start, range.end)
  if (daysBetween(end, range.start) > 0) return false;
  if (daysBetween(range.end, start) >= 0) return false;
  return true;
}

export function useGanttLayout(args: UseGanttLayoutArgs): GanttLayout {
  const { features, today, loadedRange, dayPx } = args;
  return useMemo<GanttLayout>(() => {
    const lanes: GanttLane[] = [];
    const unscheduled: FeatureSummary[] = [];
    for (const feature of features) {
      const hasPlan = featureHasAnyPlannedDate(feature);
      if (!hasPlan) {
        // Render as ghost lane — it still matters to the manager.
        lanes.push({
          feature,
          bar: null,
          stageBars: computeStageBars(loadedRange, feature, today, dayPx),
          variant: 'noPlan',
        });
        continue;
      }
      // Drop features whose plan does not overlap the loaded range — chunk
      // virtualization keeps the DOM small. Re-mounted on next chunk fetch.
      if (!planOverlapsRange(feature, loadedRange)) continue;
      const bar = barGeometryPx(
        loadedRange,
        { start: feature.plannedStart, end: feature.plannedEnd },
        dayPx,
      );
      lanes.push({
        feature,
        bar,
        stageBars: computeStageBars(loadedRange, feature, today, dayPx),
        variant: 'planned',
      });
    }
    const totalDays = daysBetween(loadedRange.start, loadedRange.end);
    const totalWidthPx = totalDays * dayPx;
    const todayDelta = daysBetween(loadedRange.start, today);
    const todayPx =
      todayDelta < 0 || todayDelta >= totalDays
        ? null
        : dateToPixel(loadedRange.start, today, dayPx);
    return {
      loadedRange,
      lanes,
      unscheduled,
      todayPx,
      totalWidthPx,
    };
  }, [features, today, loadedRange, dayPx]);
}
