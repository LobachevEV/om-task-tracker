import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureTaxonomy } from '../../../src/pages/Gantt/useFeatureTaxonomy';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  SOLO_FEATURE,
} from '../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const RANGE = { start: '2026-04-01', end: '2026-05-15' };
const DAY_PX = 16;

describe('useFeatureTaxonomy', () => {
  it('emits 3 gates and 2 tracks per feature', () => {
    const { result } = renderHook(() =>
      useFeatureTaxonomy({
        feature: MINI_TEAM_FEATURE,
        loadedRange: RANGE,
        today: FIXTURE_TODAY,
        dayPx: DAY_PX,
      }),
    );
    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.tracks.map((t) => t.track)).toEqual(['backend', 'frontend']);
    expect(result.current.specGate.gate.gateKey).toBe('spec');
  });

  it('projects in-flight phase per track when a phase is current', () => {
    const { result } = renderHook(() =>
      useFeatureTaxonomy({
        feature: SOLO_FEATURE,
        loadedRange: RANGE,
        today: FIXTURE_TODAY,
        dayPx: DAY_PX,
      }),
    );
    const be = result.current.tracks.find((t) => t.track === 'backend')!;
    expect(be.inFlightPhase).not.toBeNull();
    expect(be.inFlightPhase?.status).toBe('current');
  });

  it('returns the same memoized object across re-renders with identical inputs', () => {
    const props = {
      feature: SOLO_FEATURE,
      loadedRange: RANGE,
      today: FIXTURE_TODAY,
      dayPx: DAY_PX,
    };
    const { result, rerender } = renderHook((p: typeof props) => useFeatureTaxonomy(p), {
      initialProps: props,
    });
    const first = result.current;
    rerender(props);
    expect(result.current).toBe(first);
  });

  it('recomputes when feature reference changes', () => {
    const { result, rerender } = renderHook(
      (p: { feature: typeof SOLO_FEATURE }) =>
        useFeatureTaxonomy({
          feature: p.feature,
          loadedRange: RANGE,
          today: FIXTURE_TODAY,
          dayPx: DAY_PX,
        }),
      { initialProps: { feature: SOLO_FEATURE } },
    );
    const first = result.current;
    rerender({ feature: MINI_TEAM_FEATURE });
    expect(result.current).not.toBe(first);
    expect(result.current.feature.id).toBe(MINI_TEAM_FEATURE.id);
  });
});
