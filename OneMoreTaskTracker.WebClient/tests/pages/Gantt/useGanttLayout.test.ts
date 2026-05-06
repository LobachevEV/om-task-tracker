import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGanttLayout } from '../../../src/pages/Gantt/useGanttLayout';
import {
  FEATURE_LEVEL_DATES_ONLY_FEATURE,
  UNSCHEDULED_FEATURE,
  FIXTURE_TODAY,
} from '../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const LOADED_RANGE = { start: '2026-04-01', end: '2026-05-15' };
const DAY_PX = 16;

describe('useGanttLayout', () => {
  it('places a feature with feature-level dates only into the planned lane', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [FEATURE_LEVEL_DATES_ONLY_FEATURE],
        today: FIXTURE_TODAY,
        loadedRange: LOADED_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.lanes).toHaveLength(1);
    expect(result.current.lanes[0].variant).toBe('planned');
    expect(result.current.lanes[0].feature.id).toBe(FEATURE_LEVEL_DATES_ONLY_FEATURE.id);
  });

  it('places a feature with no dates anywhere into the noPlan lane', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [UNSCHEDULED_FEATURE],
        today: FIXTURE_TODAY,
        loadedRange: LOADED_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.lanes).toHaveLength(1);
    expect(result.current.lanes[0].variant).toBe('noPlan');
    expect(result.current.lanes[0].feature.id).toBe(UNSCHEDULED_FEATURE.id);
  });

  it('drops features whose plan falls entirely outside the loaded range', () => {
    const farFuture = {
      ...FEATURE_LEVEL_DATES_ONLY_FEATURE,
      plannedStart: '2027-01-01',
      plannedEnd:   '2027-02-01',
    };
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [farFuture],
        today: FIXTURE_TODAY,
        loadedRange: LOADED_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.lanes).toHaveLength(0);
  });

  it('renders all features when feature-level and unscheduled features are mixed', () => {
    const { result } = renderHook(() =>
      useGanttLayout({
        features: [FEATURE_LEVEL_DATES_ONLY_FEATURE, UNSCHEDULED_FEATURE],
        today: FIXTURE_TODAY,
        loadedRange: LOADED_RANGE,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.lanes).toHaveLength(2);
    const variants = result.current.lanes.map((l) => l.variant).sort();
    expect(variants).toEqual(['noPlan', 'planned']);
  });
});
