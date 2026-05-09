import type { FeatureState, FeatureSummary } from '../../common/types/feature';
import { FEATURE_STATES } from '../../common/types/feature';
import { FEATURE_STATE_ORDER } from './stateConfig';
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

interface StageWindow {
  stage: FeatureState;
  plannedStart: string | null;
  plannedEnd: string | null;
  ownerUserId: number | null;
}

/**
 * Extract per-stage flat fields from FeatureSummary into a uniform shape.
 * Replaces the old `feature.stagePlans.find(p => p.stage === stage)` pattern.
 */
function getStageWindow(feature: FeatureSummary, stage: FeatureState): StageWindow {
  switch (stage) {
    case 'CsApproving':
      return {
        stage,
        plannedStart: feature.csApprovingPlannedStart,
        plannedEnd: feature.csApprovingPlannedEnd,
        ownerUserId: feature.csApprovingOwnerUserId,
      };
    case 'Development':
      return {
        stage,
        plannedStart: feature.developmentPlannedStart,
        plannedEnd: feature.developmentPlannedEnd,
        ownerUserId: feature.developmentOwnerUserId,
      };
    case 'Testing':
      return {
        stage,
        plannedStart: feature.testingPlannedStart,
        plannedEnd: feature.testingPlannedEnd,
        ownerUserId: feature.testingOwnerUserId,
      };
    case 'EthalonTesting':
      return {
        stage,
        plannedStart: feature.ethalonTestingPlannedStart,
        plannedEnd: feature.ethalonTestingPlannedEnd,
        ownerUserId: feature.ethalonTestingOwnerUserId,
      };
    case 'LiveRelease':
      return {
        stage,
        plannedStart: feature.liveReleasePlannedStart,
        plannedEnd: feature.liveReleasePlannedEnd,
        ownerUserId: feature.liveReleaseOwnerUserId,
      };
  }
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
 * Compute a StageBarGeometry per stage in canonical order, reading flat
 * per-stage fields from FeatureSummary. Each entry carries either a real
 * `bar` (via `barGeometryPx`) OR a `ghost` placeholder anchored in the
 * loaded range.
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
    const plan = getStageWindow(feature, stage);
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
 * Count of stages that have at least one date set. Used by the info
 * panel to render the `n/5 planned` counter.
 */
export function plannedStageCount(feature: FeatureSummary): number {
  return FEATURE_STATES.filter((stage) => {
    const plan = getStageWindow(feature, stage);
    return plan.plannedStart != null || plan.plannedEnd != null;
  }).length;
}

/**
 * Is the feature overdue at the summary level? True when the active stage's
 * planned end has passed and the feature has not yet shipped.
 */
export function featureIsOverdue(feature: FeatureSummary, today: string): boolean {
  if (feature.state === 'LiveRelease') return false;
  const active = getStageWindow(feature, feature.state);
  if (active.plannedEnd == null) return false;
  return daysBetween(active.plannedEnd, today) > 0;
}

export { getStageWindow };
export type { StageWindow };
