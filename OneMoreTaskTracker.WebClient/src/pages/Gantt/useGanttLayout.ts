import { useMemo } from 'react';
import type { FeatureSummary } from '../../common/types/feature';
import {
  dateToPixel,
  daysBetween,
  type DateWindow,
} from './ganttMath';
import {
  computeFeatureGeometry,
  featureHasAnyPlannedDate,
  type FeatureBarGeometry,
} from './ganttStageGeometry';

export type GanttLaneVariant = 'planned' | 'noPlan';

export interface GanttLane {
  feature: FeatureSummary;
  geometry: FeatureBarGeometry;
  variant: GanttLaneVariant;
}

export interface GanttLayout {
  loadedRange: DateWindow;
  lanes: GanttLane[];
  unscheduled: FeatureSummary[];
  todayPx: number | null;
  totalWidthPx: number;
}

export interface UseGanttLayoutArgs {
  features: FeatureSummary[];
  today: string;
  loadedRange: DateWindow;
  dayPx: number;
}

function planOverlapsRange(
  geometry: FeatureBarGeometry,
  range: DateWindow,
): boolean {
  const summary = geometry.summaryBar;
  if (summary == null) return false;
  // Anything with a positive-width summaryBar overlaps the loaded range —
  // barGeometryPx already clips to the window.
  if (summary.widthPx <= 0) {
    // Zero-width bar means a single-day plan; still belongs in the lane
    // when its leftPx falls inside the range.
    const totalPx = daysBetween(range.start, range.end) * 1;
    return summary.leftPx >= 0 && summary.leftPx <= totalPx;
  }
  return true;
}

export function useGanttLayout(args: UseGanttLayoutArgs): GanttLayout {
  const { features, today, loadedRange, dayPx } = args;
  return useMemo<GanttLayout>(() => {
    const lanes: GanttLane[] = [];
    const unscheduled: FeatureSummary[] = [];
    for (const feature of features) {
      const geometry = computeFeatureGeometry(loadedRange, feature, today, dayPx);
      const hasPlan = featureHasAnyPlannedDate(feature);
      if (!hasPlan) {
        lanes.push({ feature, geometry, variant: 'noPlan' });
        continue;
      }
      if (!planOverlapsRange(geometry, loadedRange)) continue;
      lanes.push({ feature, geometry, variant: 'planned' });
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
