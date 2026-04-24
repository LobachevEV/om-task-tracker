import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  ALL_FEATURES,
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  SOLO_FEATURE,
  UNSCHEDULED_FEATURE,
} from './__fixtures__/FeatureFixtures';
import { useGanttLayout } from './useGanttLayout';

describe('useGanttLayout', () => {
  it('returns an empty layout for an empty features list', () => {
    const { result } = renderHook(() =>
      useGanttLayout({ features: [], today: FIXTURE_TODAY, zoom: 'week' }),
    );
    expect(result.current.lanes).toEqual([]);
    expect(result.current.unscheduled).toEqual([]);
    // By construction today is inside the weekly window starting on Monday 2026-04-20.
    expect(result.current.todayPercent).not.toBeNull();
  });

  it('keeps unscheduled features as ghost lanes instead of hiding them', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [UNSCHEDULED_FEATURE, SOLO_FEATURE],
        today: FIXTURE_TODAY,
        zoom: 'month',
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

  it('every feature is kept visible — lanes.length === features.length', () => {
    const { result } = renderHook(() =>
      useGanttLayout({ features: ALL_FEATURES, today: FIXTURE_TODAY, zoom: 'twoWeeks' }),
    );
    expect(result.current.lanes.length).toBe(ALL_FEATURES.length);
    expect(result.current.unscheduled).toEqual([]);
  });

  it('todayPercent is inside the window by construction (Monday-anchored)', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [MINI_TEAM_FEATURE],
        today: FIXTURE_TODAY,
        zoom: 'week',
      }),
    );
    expect(result.current.todayPercent).not.toBeNull();
    expect(result.current.todayPercent!).toBeGreaterThanOrEqual(0);
    expect(result.current.todayPercent!).toBeLessThan(100);
  });

  it('tags no-plan features with variant `noPlan` and bar=null', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [UNSCHEDULED_FEATURE],
        today: FIXTURE_TODAY,
        zoom: 'month',
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
        zoom: 'month',
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
      ({ zoom }: { zoom: 'week' | 'twoWeeks' | 'month' }) =>
        useGanttLayout({ features, today: FIXTURE_TODAY, zoom }),
      { initialProps: { zoom: 'week' } },
    );
    const first = result.current;
    rerender({ zoom: 'week' });
    expect(result.current).toBe(first);
    rerender({ zoom: 'month' });
    expect(result.current).not.toBe(first);
  });
});
