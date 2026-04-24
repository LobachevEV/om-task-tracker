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

export interface GanttLane {
  feature: FeatureSummary;
  /**
   * Summary-bar geometry. Null when the feature has no derivable window at all
   * (both `plannedStart` and `plannedEnd` are null AND no stagePlan has dates)
   * — in that case the feature lands in `unscheduled`, not in `lanes`.
   */
  bar: BarGeometry;
  /** Per-stage geometry, always length 5 (one per FEATURE_STATES entry). */
  stageBars: StageBarGeometry[];
}

export interface GanttLayout {
  window: DateWindow;
  lanes: GanttLane[];
  /** Features with null dates or fully outside the window. */
  unscheduled: FeatureSummary[];
  /** 0..100, or null when today is outside the window. */
  todayPercent: number | null;
}

export interface UseGanttLayoutArgs {
  features: FeatureSummary[];
  today: string;
  zoom: ZoomLevel;
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
      if (bar == null) {
        unscheduled.push(feature);
      } else {
        lanes.push({
          feature,
          bar,
          stageBars: computeStageBars(window, feature, today),
        });
      }
    }
    return {
      window,
      lanes,
      unscheduled,
      todayPercent: computeTodayPercent(window, today),
    };
  }, [features, today, zoom]);
}
