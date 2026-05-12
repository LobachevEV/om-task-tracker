import type { FeatureState, FeatureSummary } from '../../common/types/feature';
import { FEATURE_STATES } from '../../common/types/feature';
import type { FeatureTrackStageKey } from '../../common/types/featureTrack';
import { FEATURE_STATE_ORDER } from './stateConfig';
import { selectStagesForKind } from './selectStagesForKind';
import {
  addDays,
  barGeometryPx,
  daysBetween,
  type BarGeometryPx,
  type DateWindow,
} from './ganttMath';

export type StageBarStatus = 'completed' | 'current' | 'upcoming' | 'ghost';

export interface StageBarGeometry {
  stage: FeatureState;
  /** Null for ghost segments (stage has null dates → no real geometry). */
  bar: BarGeometryPx | null;
  /**
   * Ghost geometry used only for rendering placement when `bar` is null.
   * Anchored abutting the previous stage with a 3-day default width, or
   * to the loaded-range start for leading unplanned stages. Never used
   * when a real `bar` is present.
   */
  ghost: BarGeometryPx | null;
  isCurrent: boolean;
  isOverdue: boolean;
  isCompleted: boolean;
  status: StageBarStatus;
}

/** Fallback width for an unplanned (ghost) segment. */
const GHOST_DEFAULT_SPAN_DAYS = 3;

export interface StageWindow {
  stage: FeatureState;
  plannedStart: string | null;
  plannedEnd: string | null;
  ownerUserId: null;
}

/**
 * Track-stage keys that contribute to each lifecycle FeatureState.
 * Both Frontend and Backend keys are listed; the rollup takes whichever
 * tracks the feature actually has.
 */
const LIFECYCLE_TO_TRACK_STAGE_KEYS: Record<FeatureState, FeatureTrackStageKey[]> = {
  CsApproving:    ['SrApproving', 'CsApproving'],
  Development:    ['Development'],
  Testing:        ['StandTesting'],
  EthalonTesting: ['EthalonTesting'],
  LiveRelease:    ['ReleaseToLive'],
};

/**
 * Compute the planned window for a lifecycle stage by rolling up all matching
 * track stages across all tracks on the feature.
 * - plannedStart = min of all non-null starts
 * - plannedEnd   = max of all non-null ends
 * - ownerUserId  = null (no owner badge on Gantt rollup bar)
 */
export function computeLifecycleStageWindow(
  feature: FeatureSummary,
  stage: FeatureState,
): StageWindow {
  const trackStageKeys = LIFECYCLE_TO_TRACK_STAGE_KEYS[stage];
  const tracks = feature.tracks ?? [];

  const starts: string[] = [];
  const ends: string[] = [];

  for (const track of tracks) {
    for (const ts of selectStagesForKind(track.stages, track.kind)) {
      if (!trackStageKeys.includes(ts.stageKey)) continue;
      if (ts.plannedStart != null) starts.push(ts.plannedStart);
      if (ts.plannedEnd != null) ends.push(ts.plannedEnd);
    }
  }

  const plannedStart = starts.length > 0 ? starts.reduce((a, b) => (a < b ? a : b)) : null;
  const plannedEnd = ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : null;

  return { stage, plannedStart, plannedEnd, ownerUserId: null };
}

function stageIsOverdue(
  plan: StageWindow,
  feature: FeatureSummary,
  today: string,
): boolean {
  if (plan.plannedEnd == null) return false;
  if (plan.stage === feature.state && feature.state === 'LiveRelease') return false;
  const stageOrder = FEATURE_STATE_ORDER[plan.stage];
  const currentOrder = FEATURE_STATE_ORDER[feature.state];
  if (stageOrder < currentOrder) return false;
  return daysBetween(plan.plannedEnd, today) > 0;
}

function stageIsCompleted(plan: StageWindow, feature: FeatureSummary): boolean {
  const stageOrder = FEATURE_STATE_ORDER[plan.stage];
  const currentOrder = FEATURE_STATE_ORDER[feature.state];
  if (stageOrder < currentOrder) return true;
  return plan.stage === 'LiveRelease' && feature.state === 'LiveRelease';
}

function statusOf(opts: {
  isCurrent: boolean;
  isCompleted: boolean;
  ghosted: boolean;
}): StageBarStatus {
  if (opts.ghosted) return 'ghost';
  if (opts.isCompleted) return 'completed';
  if (opts.isCurrent) return 'current';
  return 'upcoming';
}

/**
 * Compute a StageBarGeometry per lifecycle stage in canonical order, rolling
 * up planned dates from track stages. Each entry carries either a real `bar`
 * or a `ghost` placeholder anchored in the loaded range.
 *
 * Pure function — no side effects, no I/O.
 */
export function computeStageBars(
  loadedRange: DateWindow,
  feature: FeatureSummary,
  today: string,
  dayPx: number,
): StageBarGeometry[] {
  let ghostAnchor: string = loadedRange.start;
  const out: StageBarGeometry[] = [];
  for (const stage of FEATURE_STATES) {
    const plan = computeLifecycleStageWindow(feature, stage);
    const hasAnyDate = plan.plannedStart != null || plan.plannedEnd != null;
    const bar = barGeometryPx(
      loadedRange,
      { start: plan.plannedStart, end: plan.plannedEnd },
      dayPx,
    );
    if (hasAnyDate) {
      if (plan.plannedEnd != null) {
        ghostAnchor = plan.plannedEnd;
      }
      const isCurrent = plan.stage === feature.state;
      const isCompleted = stageIsCompleted(plan, feature);
      out.push({
        stage,
        bar,
        ghost: null,
        isCurrent,
        isOverdue: stageIsOverdue(plan, feature, today),
        isCompleted,
        status: statusOf({ isCurrent, isCompleted, ghosted: false }),
      });
      continue;
    }

    const ghostStart = ghostAnchor;
    const ghostEnd = addDays(ghostAnchor, GHOST_DEFAULT_SPAN_DAYS);
    ghostAnchor = ghostEnd;
    const isCurrent = plan.stage === feature.state;
    out.push({
      stage,
      bar: null,
      ghost: barGeometryPx(loadedRange, { start: ghostStart, end: ghostEnd }, dayPx),
      isCurrent,
      isOverdue: false,
      isCompleted: false,
      status: statusOf({ isCurrent, isCompleted: false, ghosted: true }),
    });
  }
  return out;
}

/**
 * Index of the active stage (`feature.state`) in canonical FEATURE_STATES
 * order. Always in 0..4 range for valid inputs.
 */
export function activeStageIndex(feature: FeatureSummary): number {
  return FEATURE_STATE_ORDER[feature.state];
}

/**
 * Count of lifecycle stages that have at least one date set (from track rollup).
 * Used by the info panel to render the `n/5 planned` counter.
 */
export function plannedStageCount(feature: FeatureSummary): number {
  return FEATURE_STATES.filter((stage) => {
    const plan = computeLifecycleStageWindow(feature, stage);
    return plan.plannedStart != null || plan.plannedEnd != null;
  }).length;
}

/**
 * Is the feature overdue at the summary level? True when the active stage's
 * planned end has passed and the feature has not yet shipped.
 */
export function featureIsOverdue(feature: FeatureSummary, today: string): boolean {
  if (feature.state === 'LiveRelease') return false;
  const active = computeLifecycleStageWindow(feature, feature.state);
  if (active.plannedEnd == null) return false;
  return daysBetween(active.plannedEnd, today) > 0;
}
