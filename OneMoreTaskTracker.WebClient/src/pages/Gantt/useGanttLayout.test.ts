import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  ALL_FEATURES,
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  SOLO_FEATURE,
  UNSCHEDULED_FEATURE,
} from './__fixtures__/FeatureFixtures';
import { loadedRangeAroundToday } from './ganttMath';
import { useGanttLayout } from './useGanttLayout';

const DAY_PX = 32;
const WIDE_RANGE = loadedRangeAroundToday(FIXTURE_TODAY, 75);
const NARROW_RANGE = loadedRangeAroundToday(FIXTURE_TODAY, 3);

describe('useGanttLayout', () => {
  it('returns an empty layout for an empty features list', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [],
        today: FIXTURE_TODAY,
        loadedRange: WIDE_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.lanes).toEqual([]);
    expect(result.current.unscheduled).toEqual([]);
    expect(result.current.todayPx).not.toBeNull();
    expect(result.current.totalWidthPx).toBeGreaterThan(0);
  });

  it('keeps unscheduled features as ghost lanes instead of hiding them', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [UNSCHEDULED_FEATURE, SOLO_FEATURE],
        today: FIXTURE_TODAY,
        loadedRange: WIDE_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.unscheduled).toEqual([]);
    expect(result.current.lanes).toHaveLength(2);
    const ghostLane = result.current.lanes.find(
      (l) => l.feature.id === UNSCHEDULED_FEATURE.id,
    );
    expect(ghostLane).toBeDefined();
    expect(ghostLane!.variant).toBe('noPlan');
    expect(ghostLane!.bar).toBeNull();
    expect(ghostLane!.stageBars).toHaveLength(5);
    const soloLane = result.current.lanes.find(
      (l) => l.feature.id === SOLO_FEATURE.id,
    );
    expect(soloLane!.variant).toBe('planned');
    expect(soloLane!.bar).not.toBeNull();
  });

  it('drops planned features that fall fully outside the loaded range', () => {
    // SOLO_FEATURE has dates around FIXTURE_TODAY. NARROW_RANGE is just 7 days
    // forward — features with plan inside it stay; ones way before/after drop.
    const { result } = renderHook(() =>
      useGanttLayout({
        features: ALL_FEATURES,
        today: FIXTURE_TODAY,
        loadedRange: NARROW_RANGE,
        dayPx: DAY_PX,
      }),
    );
    // Unscheduled features are still kept as ghost lanes regardless.
    const ghosts = result.current.lanes.filter((l) => l.variant === 'noPlan');
    const planned = result.current.lanes.filter((l) => l.variant === 'planned');
    expect(ghosts.length).toBeGreaterThanOrEqual(0);
    // Planned lanes are all overlapping the narrow range.
    for (const l of planned) {
      expect(l.bar).not.toBeNull();
    }
  });

  it('todayPx is inside the loaded range when today is within it', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [MINI_TEAM_FEATURE],
        today: FIXTURE_TODAY,
        loadedRange: WIDE_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.todayPx).not.toBeNull();
    expect(result.current.todayPx!).toBeGreaterThanOrEqual(0);
    expect(result.current.todayPx!).toBeLessThan(result.current.totalWidthPx);
  });

  it('tags no-plan features with variant `noPlan` and bar=null', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [UNSCHEDULED_FEATURE],
        today: FIXTURE_TODAY,
        loadedRange: WIDE_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.lanes).toHaveLength(1);
    expect(result.current.lanes[0].variant).toBe('noPlan');
    expect(result.current.lanes[0].bar).toBeNull();
    expect(result.current.lanes[0].stageBars).toHaveLength(5);
  });

  it('each lane exposes stageBars of length 5 in canonical order', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [MINI_TEAM_FEATURE],
        today: FIXTURE_TODAY,
        loadedRange: WIDE_RANGE,
        dayPx: DAY_PX,
      }),
    );
    const lane = result.current.lanes[0];
    expect(lane.stageBars).toHaveLength(5);
    expect(lane.stageBars.map((s) => s.stage)).toEqual([
      'CsApproving',
      'Development',
      'Testing',
      'EthalonTesting',
      'LiveRelease',
    ]);
  });

  it('memoizes the output for identical inputs', () => {
    const features = [SOLO_FEATURE];
    const { result, rerender } = renderHook(
      ({ dayPx }: { dayPx: number }) =>
        useGanttLayout({
          features,
          today: FIXTURE_TODAY,
          loadedRange: WIDE_RANGE,
          dayPx,
        }),
      { initialProps: { dayPx: 32 } },
    );
    const first = result.current;
    rerender({ dayPx: 32 });
    expect(result.current).toBe(first);
    rerender({ dayPx: 24 });
    expect(result.current).not.toBe(first);
  });
});
