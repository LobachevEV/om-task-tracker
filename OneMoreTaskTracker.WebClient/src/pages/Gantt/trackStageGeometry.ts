import {
  addDays,
  barGeometryPx,
  daysBetween,
  type BarGeometryPx,
  type DateWindow,
} from './ganttMath';
import type { FeatureTrack, FeatureTrackStage } from '../../common/types/featureTrack';

export type TrackStageBarStatus = 'completed' | 'current' | 'upcoming' | 'ghost';

export interface TrackStageBarGeometry {
  stageKey: string;
  status: TrackStageBarStatus;
  bar: BarGeometryPx | null;
  /** Ghost bar shown when no dates are set yet. */
  ghost: BarGeometryPx | null;
}

const GHOST_DEFAULT_SPAN_DAYS = 7;

function isStagePast(stage: FeatureTrackStage, today: string): boolean {
  if (!stage.plannedEnd) return false;
  return daysBetween(stage.plannedEnd, today) > 0;
}

function isStageActive(stage: FeatureTrackStage, today: string): boolean {
  if (!stage.plannedStart || !stage.plannedEnd) return false;
  const afterStart = daysBetween(stage.plannedStart, today) >= 0;
  const beforeEnd = daysBetween(today, stage.plannedEnd) >= 0;
  return afterStart && beforeEnd;
}

function resolveStatus(
  stage: FeatureTrackStage,
  today: string,
): TrackStageBarStatus {
  if (isStagePast(stage, today)) return 'completed';
  if (isStageActive(stage, today)) return 'current';
  if (stage.plannedStart || stage.plannedEnd) return 'upcoming';
  return 'ghost';
}

/**
 * Compute a TrackStageBarGeometry per entry in `track.stages`, preserving
 * the original stage order. Each entry either has a `bar` (placed via
 * `barGeometryPx`) OR a `ghost` placeholder anchored in the loaded range.
 */
export function computeTrackStageBars(
  loadedRange: DateWindow,
  track: FeatureTrack,
  today: string,
  dayPx: number,
): TrackStageBarGeometry[] {
  const out: TrackStageBarGeometry[] = [];

  for (const stage of track.stages) {
    const status = resolveStatus(stage, today);

    if (status === 'ghost') {
      const ghostAnchor = today > loadedRange.start ? today : loadedRange.start;
      const ghostStart = ghostAnchor;
      const ghostEnd = addDays(ghostAnchor, GHOST_DEFAULT_SPAN_DAYS - 1);
      out.push({
        stageKey: stage.stageKey,
        status,
        bar: null,
        ghost: barGeometryPx(
          loadedRange,
          { start: ghostStart, end: ghostEnd },
          dayPx,
        ),
      });
      continue;
    }

    const bar = barGeometryPx(
      loadedRange,
      { start: stage.plannedStart ?? null, end: stage.plannedEnd ?? null },
      dayPx,
    );

    out.push({ stageKey: stage.stageKey, status, bar, ghost: null });
  }

  return out;
}

export function trackIsOverdue(track: FeatureTrack, today: string): boolean {
  const lastStage = track.stages[track.stages.length - 1];
  if (!lastStage?.plannedEnd) return false;
  return daysBetween(lastStage.plannedEnd, today) > 0;
}
