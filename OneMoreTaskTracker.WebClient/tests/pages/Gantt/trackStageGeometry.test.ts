import { describe, expect, it } from 'vitest';
import type { FeatureTrack } from '../../../src/common/types/featureTrack';
import { windowForZoom } from '../../../src/pages/Gantt/ganttMath';
import {
  computeTrackStageBars,
  trackIsOverdue,
} from '../../../src/pages/Gantt/trackStageGeometry';
import { FIXTURE_TODAY } from '../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const DAY_PX = 32;
const WINDOW = windowForZoom(FIXTURE_TODAY, 'month');

function makeTrack(overrides: Partial<FeatureTrack> = {}): FeatureTrack {
  return {
    id: 1,
    featureId: 101,
    kind: 'Frontend',
    trackOwnerUserId: 11,
    version: 1,
    stages: [],
    ...overrides,
  };
}

describe('computeTrackStageBars', () => {
  it('returns one geometry per stage, preserving order', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'SrApproving', plannedStart: '2026-04-10', plannedEnd: '2026-04-15', stageOwnerUserId: null, stageVersion: 1 },
        { stageKey: 'Development', plannedStart: '2026-04-15', plannedEnd: '2026-04-25', stageOwnerUserId: null, stageVersion: 1 },
      ],
    });
    const bars = computeTrackStageBars(WINDOW, track, FIXTURE_TODAY, DAY_PX);
    expect(bars).toHaveLength(2);
    expect(bars[0].stageKey).toBe('SrApproving');
    expect(bars[1].stageKey).toBe('Development');
  });

  it('marks a past stage (plannedEnd before today) as completed', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'SrApproving', plannedStart: '2026-04-01', plannedEnd: '2026-04-10', stageOwnerUserId: null, stageVersion: 1 },
      ],
    });
    const bars = computeTrackStageBars(WINDOW, track, FIXTURE_TODAY, DAY_PX);
    expect(bars[0].status).toBe('completed');
    // bar may be null when the stage falls outside the loaded range window
    expect(bars[0].ghost).toBeNull();
  });

  it('marks the active stage (today between start and end) as current', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'Development', plannedStart: '2026-04-15', plannedEnd: '2026-04-30', stageOwnerUserId: null, stageVersion: 1 },
      ],
    });
    const bars = computeTrackStageBars(WINDOW, track, FIXTURE_TODAY, DAY_PX);
    expect(bars[0].status).toBe('current');
  });

  it('marks a future stage (plannedStart after today) as upcoming', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'ReleaseToLive', plannedStart: '2026-05-01', plannedEnd: '2026-05-05', stageOwnerUserId: null, stageVersion: 1 },
      ],
    });
    const bars = computeTrackStageBars(WINDOW, track, FIXTURE_TODAY, DAY_PX);
    expect(bars[0].status).toBe('upcoming');
  });

  it('produces a ghost geometry for a stage with no dates', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'StandTesting', plannedStart: null, plannedEnd: null, stageOwnerUserId: null, stageVersion: 0 },
      ],
    });
    const bars = computeTrackStageBars(WINDOW, track, FIXTURE_TODAY, DAY_PX);
    expect(bars[0].status).toBe('ghost');
    expect(bars[0].bar).toBeNull();
    expect(bars[0].ghost).not.toBeNull();
    expect(bars[0].ghost!.widthPx).toBeGreaterThan(0);
  });

  it('ghost bar has width = 7 days in px', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'EthalonTesting', plannedStart: null, plannedEnd: null, stageOwnerUserId: null, stageVersion: 0 },
      ],
    });
    const bars = computeTrackStageBars(WINDOW, track, FIXTURE_TODAY, DAY_PX);
    expect(bars[0].ghost!.widthPx).toBe(7 * DAY_PX);
  });

  it('returns empty array for a track with no stages', () => {
    const track = makeTrack({ stages: [] });
    expect(computeTrackStageBars(WINDOW, track, FIXTURE_TODAY, DAY_PX)).toEqual([]);
  });
});

describe('trackIsOverdue', () => {
  it('returns true when last stage plannedEnd is past today', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'ReleaseToLive', plannedStart: '2026-04-01', plannedEnd: '2026-04-15', stageOwnerUserId: null, stageVersion: 1 },
      ],
    });
    expect(trackIsOverdue(track, FIXTURE_TODAY)).toBe(true);
  });

  it('returns false when last stage plannedEnd is today', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'ReleaseToLive', plannedStart: '2026-04-20', plannedEnd: FIXTURE_TODAY, stageOwnerUserId: null, stageVersion: 1 },
      ],
    });
    expect(trackIsOverdue(track, FIXTURE_TODAY)).toBe(false);
  });

  it('returns false when last stage has no plannedEnd', () => {
    const track = makeTrack({
      stages: [
        { stageKey: 'ReleaseToLive', plannedStart: null, plannedEnd: null, stageOwnerUserId: null, stageVersion: 0 },
      ],
    });
    expect(trackIsOverdue(track, FIXTURE_TODAY)).toBe(false);
  });

  it('returns false when stages array is empty', () => {
    const track = makeTrack({ stages: [] });
    expect(trackIsOverdue(track, FIXTURE_TODAY)).toBe(false);
  });

  it('examines only the last stage, not earlier ones', () => {
    const track = makeTrack({
      stages: [
        // This one is past, but it is not last
        { stageKey: 'Development', plannedStart: '2026-04-01', plannedEnd: '2026-04-10', stageOwnerUserId: null, stageVersion: 1 },
        // Last stage is in the future — track not overdue
        { stageKey: 'ReleaseToLive', plannedStart: '2026-04-25', plannedEnd: '2026-04-30', stageOwnerUserId: null, stageVersion: 1 },
      ],
    });
    expect(trackIsOverdue(track, FIXTURE_TODAY)).toBe(false);
  });
});
