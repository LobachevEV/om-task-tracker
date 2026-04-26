import type { FeatureState, FeatureStagePlan, FeatureSummary } from '../../shared/types/feature';
import { FEATURE_STATES } from '../../shared/types/feature';
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

function stageIsOverdue(
  stage: FeatureStagePlan,
  feature: FeatureSummary,
  today: string,
): boolean {
  if (stage.plannedEnd == null) return false;
  if (stage.stage === feature.state && feature.state === 'LiveRelease') return false;
  const stageOrder = FEATURE_STATE_ORDER[stage.stage];
  const currentOrder = FEATURE_STATE_ORDER[feature.state];
  // Completed stages (already past) are NOT "overdue" — they were done.
  if (stageOrder < currentOrder) return false;
  return daysBetween(stage.plannedEnd, today) > 0;
}

function stageIsCompleted(stage: FeatureStagePlan, feature: FeatureSummary): boolean {
  const stageOrder = FEATURE_STATE_ORDER[stage.stage];
  const currentOrder = FEATURE_STATE_ORDER[feature.state];
  if (stageOrder < currentOrder) return true;
  // LiveRelease + current stage = feature has shipped; treat that final stage as complete.
  return stage.stage === 'LiveRelease' && feature.state === 'LiveRelease';
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
 * Compute a StageBarGeometry per entry in `feature.stagePlans`, preserving
 * canonical order. Each entry carries either a real `bar` (via
 * `barGeometryPx`) OR a `ghost` placeholder anchored in the loaded range.
 *
 * Pure function — no side effects, no I/O.
 */
export function computeStageBars(
  loadedRange: DateWindow,
  feature: FeatureSummary,
  today: string,
  dayPx: number,
): StageBarGeometry[] {
  // Build an anchor pointer so ghost segments can be placed against the
  // previous stage's planned end (or the range start for leading ghosts).
  let ghostAnchor: string = loadedRange.start;
  const out: StageBarGeometry[] = [];
  // Iterate in canonical order regardless of input order — the contract guarantees
  // order, but defensive iteration keeps us resilient.
  const planByStage = new Map(feature.stagePlans.map((p) => [p.stage, p]));
  for (const stage of FEATURE_STATES) {
    const plan = planByStage.get(stage);
    if (plan == null) {
      // Contract says length 5 — if we ever miss one, render a ghost.
      const ghostStart = ghostAnchor;
      const ghostEnd = addDays(ghostAnchor, GHOST_DEFAULT_SPAN_DAYS);
      out.push({
        stage,
        bar: null,
        ghost: barGeometryPx(loadedRange, { start: ghostStart, end: ghostEnd }, dayPx),
        isCurrent: stage === feature.state,
        isOverdue: false,
        isCompleted: false,
        status: statusOf({
          isCurrent: stage === feature.state,
          isCompleted: false,
          ghosted: true,
        }),
      });
      continue;
    }

    const hasAnyDate = plan.plannedStart != null || plan.plannedEnd != null;
    const bar = barGeometryPx(
      loadedRange,
      { start: plan.plannedStart, end: plan.plannedEnd },
      dayPx,
    );
    if (hasAnyDate) {
      // Plan has real dates — compute status flags from the contract, even
      // when the geometry falls outside the loaded range (the caller still
      // needs accurate completion/overdue/current flags for the info panel
      // and the expanded sub-row list).
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

    // No real dates — render a ghost segment anchored against the previous
    // stage's end (or the range start for leading unplanned stages).
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
 * Count of stage plans that have at least one date set. Used by the info
 * panel to render the `n/5 planned` counter.
 */
export function plannedStageCount(feature: FeatureSummary): number {
  return feature.stagePlans.filter(
    (p) => p.plannedStart != null || p.plannedEnd != null,
  ).length;
}

/**
 * Is the feature overdue at the summary level? True when the active stage's
 * planned end has passed and the feature has not yet shipped.
 */
export function featureIsOverdue(feature: FeatureSummary, today: string): boolean {
  if (feature.state === 'LiveRelease') return false;
  const active = feature.stagePlans.find((p) => p.stage === feature.state);
  if (!active || active.plannedEnd == null) return false;
  return daysBetween(active.plannedEnd, today) > 0;
}
