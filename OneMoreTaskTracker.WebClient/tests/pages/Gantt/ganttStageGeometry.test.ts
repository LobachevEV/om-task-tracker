import { describe, it, expect } from 'vitest';
import {
  computeFeatureGeometry,
  featureHasAnyPlannedDate,
  plannedSubStageCount,
  featureIsOverdue,
} from '../../../src/pages/Gantt/ganttStageGeometry';
import {
  SOLO_FEATURE,
  MINI_TEAM_FEATURE,
  UNSCHEDULED_FEATURE,
  OVERDUE_FEATURE,
  SHIPPED_FEATURE,
  FIXTURE_TODAY,
} from '../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const RANGE = { start: '2026-04-01', end: '2026-05-15' };
const DAY_PX = 16;

describe('computeFeatureGeometry — gates and tracks', () => {
  it('emits exactly 3 gates and 2 tracks for any feature', () => {
    const g = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    expect(g.tracks).toHaveLength(2);
    expect(g.tracks.map((t) => t.track)).toEqual(['backend', 'frontend']);
    expect(g.specGate.gate.gateKey).toBe('spec');
    expect(g.tracks[0].prepGate.gate.gateKey).toBe('backend.prep-gate');
    expect(g.tracks[1].prepGate.gate.gateKey).toBe('frontend.prep-gate');
  });

  it('flags specBlocked when spec is not approved', () => {
    const featureWithWaitingSpec = {
      ...MINI_TEAM_FEATURE,
      taxonomy: {
        ...MINI_TEAM_FEATURE.taxonomy,
        gates: MINI_TEAM_FEATURE.taxonomy.gates.map((gate) =>
          gate.gateKey === 'spec' ? { ...gate, status: 'waiting' as const } : gate,
        ),
      },
    };
    const g = computeFeatureGeometry(RANGE, featureWithWaitingSpec, FIXTURE_TODAY, DAY_PX);
    expect(g.specBlocked).toBe(true);
  });

  it('dims a track whose prep gate is waiting', () => {
    const g = computeFeatureGeometry(RANGE, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
    const fe = g.tracks.find((t) => t.track === 'frontend');
    expect(fe?.dimmed).toBe(true);
    const be = g.tracks.find((t) => t.track === 'backend');
    expect(be?.dimmed).toBe(false);
  });

  it('exposes 4 phases per track in canonical order', () => {
    const g = computeFeatureGeometry(RANGE, SOLO_FEATURE, FIXTURE_TODAY, DAY_PX);
    for (const track of g.tracks) {
      expect(track.phases.map((p) => p.phase)).toEqual([
        'development',
        'stand-testing',
        'ethalon-testing',
        'live-release',
      ]);
    }
  });

  it('exposes inFlightPhase as the phase whose status is current', () => {
    const g = computeFeatureGeometry(RANGE, SOLO_FEATURE, FIXTURE_TODAY, DAY_PX);
    const be = g.tracks.find((t) => t.track === 'backend');
    expect(be?.inFlightPhase).not.toBeNull();
    expect(be?.inFlightPhase?.status).toBe('current');
  });

  it('returns null inFlightPhase when no phase is current', () => {
    const g = computeFeatureGeometry(RANGE, SHIPPED_FEATURE, FIXTURE_TODAY, DAY_PX);
    for (const track of g.tracks) {
      expect(track.inFlightPhase?.status).not.toBe('current');
    }
  });
});

describe('plannedSubStageCount', () => {
  it('counts every sub-stage with a plannedStart or plannedEnd', () => {
    const counts = plannedSubStageCount(SOLO_FEATURE);
    expect(counts.total).toBeGreaterThan(0);
    expect(counts.planned).toBe(counts.total);
  });

  it('returns planned=0 for an unscheduled feature', () => {
    const counts = plannedSubStageCount(UNSCHEDULED_FEATURE);
    expect(counts.planned).toBe(0);
    expect(counts.total).toBeGreaterThan(0);
  });
});

describe('featureHasAnyPlannedDate', () => {
  it('true when feature.plannedStart is set', () => {
    expect(featureHasAnyPlannedDate(SOLO_FEATURE)).toBe(true);
  });
  it('false when nothing is planned', () => {
    expect(featureHasAnyPlannedDate(UNSCHEDULED_FEATURE)).toBe(false);
  });
});

describe('featureIsOverdue', () => {
  it('true for OVERDUE_FEATURE on FIXTURE_TODAY', () => {
    expect(featureIsOverdue(OVERDUE_FEATURE, FIXTURE_TODAY)).toBe(true);
  });
  it('false for SHIPPED_FEATURE (state=LiveRelease)', () => {
    expect(featureIsOverdue(SHIPPED_FEATURE, FIXTURE_TODAY)).toBe(false);
  });
});
