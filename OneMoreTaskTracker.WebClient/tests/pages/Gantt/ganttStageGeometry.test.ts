import { describe, expect, it } from 'vitest';
import { FEATURE_STATES } from '../../../src/common/types/feature';
import {
  MINI_TEAM_FEATURE,
  OVERDUE_FEATURE,
  SHIPPED_FEATURE,
  UNSCHEDULED_FEATURE,
  FIXTURE_TODAY,
} from '../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import { windowForZoom } from '../../../src/pages/Gantt/ganttMath';
import {
  activeStageIndex,
  computeStageBars,
  featureIsOverdue,
  plannedStageCount,
} from '../../../src/pages/Gantt/ganttStageGeometry';

const windowMonth = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

describe('computeStageBars', () => {
  it('returns exactly 5 geometries in canonical stage order', () => {
    const bars = computeStageBars(windowMonth, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    expect(bars.map((b) => b.stage)).toEqual([...FEATURE_STATES]);
    expect(bars).toHaveLength(5);
  });

  it('marks the stage equal to feature.state as isCurrent', () => {
    const bars = computeStageBars(windowMonth, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const currents = bars.filter((b) => b.isCurrent);
    expect(currents).toHaveLength(1);
    expect(currents[0].stage).toBe(MINI_TEAM_FEATURE.state);
  });

  it('marks stages before feature.state as completed', () => {
    const bars = computeStageBars(windowMonth, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const csApproving = bars.find((b) => b.stage === 'CsApproving');
    expect(csApproving?.isCompleted).toBe(true);
    expect(csApproving?.status).toBe('completed');
  });

  it('produces ghost geometries for an all-unplanned feature', () => {
    const bars = computeStageBars(windowMonth, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX);
    expect(bars.every((b) => b.bar == null)).toBe(true);
    expect(bars.every((b) => b.status === 'ghost')).toBe(true);
  });

  it('produces ghost geometry for individually-unplanned stages in a partial plan', () => {
    // OVERDUE_FEATURE only has CsApproving + Development planned; Testing,
    // EthalonTesting, LiveRelease are null.
    const bars = computeStageBars(windowMonth, OVERDUE_FEATURE, FIXTURE_TODAY, DAY_PX);
    const testing = bars.find((b) => b.stage === 'Testing');
    expect(testing?.bar).toBeNull();
    expect(testing?.status).toBe('ghost');
  });

  it('flags an overdue stage when today > plannedEnd and stage is active', () => {
    // OVERDUE_FEATURE.state = Development with plannedEnd '2026-04-10';
    // FIXTURE_TODAY = '2026-04-21' → overdue.
    const bars = computeStageBars(windowMonth, OVERDUE_FEATURE, FIXTURE_TODAY, DAY_PX);
    const dev = bars.find((b) => b.stage === 'Development');
    expect(dev?.isOverdue).toBe(true);
  });

  it('does not flag a completed stage as overdue', () => {
    const bars = computeStageBars(windowMonth, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const csApproving = bars.find((b) => b.stage === 'CsApproving');
    expect(csApproving?.isOverdue).toBe(false);
  });

  it('treats LiveRelease feature as fully completed — no overdue', () => {
    const bars = computeStageBars(windowMonth, SHIPPED_FEATURE, FIXTURE_TODAY, DAY_PX);
    expect(bars.every((b) => !b.isOverdue)).toBe(true);
    const live = bars.find((b) => b.stage === 'LiveRelease');
    expect(live?.isCompleted).toBe(true);
  });

  it('emits px-based geometry against dayPx', () => {
    const bars = computeStageBars(windowMonth, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const realBars = bars.filter((b) => b.bar !== null);
    expect(realBars.length).toBeGreaterThan(0);
    for (const b of realBars) {
      expect(b.bar!.leftPx).toBeGreaterThanOrEqual(0);
      expect(b.bar!.widthPx).toBeGreaterThan(0);
      expect(Number.isInteger(b.bar!.leftPx)).toBe(true);
    }
  });
});

describe('activeStageIndex', () => {
  it('returns the canonical index for the feature state', () => {
    // FEATURE_STATES: CsApproving=0, Development=1, Testing=2, EthalonTesting=3, LiveRelease=4
    expect(activeStageIndex(MINI_TEAM_FEATURE)).toBe(2); // Testing
    expect(activeStageIndex(OVERDUE_FEATURE)).toBe(1); // Development
    expect(activeStageIndex(SHIPPED_FEATURE)).toBe(4); // LiveRelease
  });
});

describe('plannedStageCount', () => {
  it('counts stages with at least one date', () => {
    expect(plannedStageCount(MINI_TEAM_FEATURE)).toBe(5);
    expect(plannedStageCount(OVERDUE_FEATURE)).toBe(2);
    expect(plannedStageCount(UNSCHEDULED_FEATURE)).toBe(0);
  });
});

describe('featureIsOverdue', () => {
  it('returns true when active stage plannedEnd is past today', () => {
    expect(featureIsOverdue(OVERDUE_FEATURE, FIXTURE_TODAY)).toBe(true);
  });

  it('returns false for LiveRelease features', () => {
    expect(featureIsOverdue(SHIPPED_FEATURE, FIXTURE_TODAY)).toBe(false);
  });

  it('returns false when active stage has no plannedEnd', () => {
    expect(featureIsOverdue(UNSCHEDULED_FEATURE, FIXTURE_TODAY)).toBe(false);
  });
});
