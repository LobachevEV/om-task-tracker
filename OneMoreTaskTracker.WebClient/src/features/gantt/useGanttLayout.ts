import { useMemo } from 'react';
import type { FeatureSummary } from '../../shared/types/feature';
import {
  barGeometry,
  todayPercent as computeTodayPercent,
  windowForZoom,
  type BarGeometry,
  type DateWindow,
  type ZoomLevel,
} from './ganttMath';
import { computeStageBars, type StageBarGeometry } from './ganttStageGeometry';

export type GanttLaneVariant = 'planned' | 'noPlan' | 'outOfWindow';

export interface GanttLane {
  feature: FeatureSummary;
  /**
   * Summary-bar geometry. Null when the feature has no derivable window
   * inside the current viewport (no dates at all, or the planned range falls
   * entirely outside the window). The row still renders as a ghost lane so
   * the manager can see "this feature exists but has no plan yet" or
   * "overdue before the window starts" without it silently disappearing.
   */
  bar: BarGeometry | null;
  /** Per-stage geometry, always length 5 (one per FEATURE_STATES entry). */
  stageBars: StageBarGeometry[];
  /**
   * Why the feature is rendered the way it is:
   *  - `planned`      → bar fits inside the window, render normally.
   *  - `noPlan`       → no stagePlan has any date; render a ghost summary bar
   *                     labelled "Not planned yet".
   *  - `outOfWindow`  → the feature IS planned but falls outside the current
   *                     window (e.g. a feature that went overdue before the
   *                     window's start). Render a ghost lane so it remains
   *                     triageable.
   */
  variant: GanttLaneVariant;
}

export interface GanttLayout {
  window: DateWindow;
  lanes: GanttLane[];
  /**
   * Features intentionally hidden from the main schedule (e.g. legacy dataset
   * without `stagePlans`). Every feature in-scope for the stage-timeline view
   * ends up in `lanes` so the manager never loses a row silently.
   */
  unscheduled: FeatureSummary[];
  /** 0..100, or null when today is outside the window. */
  todayPercent: number | null;
}

export interface UseGanttLayoutArgs {
  features: FeatureSummary[];
  today: string;
  zoom: ZoomLevel;
}

function featureHasAnyPlannedDate(feature: FeatureSummary): boolean {
  if (feature.plannedStart != null || feature.plannedEnd != null) return true;
  return feature.stagePlans.some(
    (p) => p.plannedStart != null || p.plannedEnd != null,
  );
}

export function useGanttLayout(args: UseGanttLayoutArgs): GanttLayout {
  const { features, today, zoom } = args;
  return useMemo<GanttLayout>(() => {
    const window = windowForZoom(today, zoom);
    const lanes: GanttLane[] = [];
    const unscheduled: FeatureSummary[] = [];
    for (const feature of features) {
      const bar = barGeometry(window, {
        start: feature.plannedStart,
        end: feature.plannedEnd,
      });
      const hasPlan = featureHasAnyPlannedDate(feature);
      let variant: GanttLaneVariant;
      if (bar != null) {
        variant = 'planned';
      } else if (!hasPlan) {
        variant = 'noPlan';
      } else {
        variant = 'outOfWindow';
      }
      lanes.push({
        feature,
        bar,
        stageBars: computeStageBars(window, feature, today),
        variant,
      });
    }
    return {
      window,
      lanes,
      unscheduled,
      todayPercent: computeTodayPercent(window, today),
    };
  }, [features, today, zoom]);
}
