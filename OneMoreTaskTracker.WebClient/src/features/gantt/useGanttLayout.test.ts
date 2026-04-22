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

  it('routes unscheduled features into `unscheduled` and places lanes separately', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [UNSCHEDULED_FEATURE, SOLO_FEATURE],
        today: FIXTURE_TODAY,
        zoom: 'month',
      }),
    );
    expect(result.current.unscheduled).toEqual([UNSCHEDULED_FEATURE]);
    expect(result.current.lanes).toHaveLength(1);
    expect(result.current.lanes[0].feature.id).toBe(SOLO_FEATURE.id);
  });

  it('conserves features across the split — lanes.length + unscheduled.length === features.length', () => {
    const { result } = renderHook(() =>
      useGanttLayout({ features: ALL_FEATURES, today: FIXTURE_TODAY, zoom: 'twoWeeks' }),
    );
    expect(result.current.lanes.length + result.current.unscheduled.length).toBe(
      ALL_FEATURES.length,
    );
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
