import { describe, expect, it } from 'vitest';
import type { FeatureSummary } from '../../../src/common/types/feature';
import type { FeatureTrack } from '../../../src/common/types/featureTrack';
import { computeLifecycleStageWindow } from '../../../src/pages/Gantt/ganttStageGeometry';

function makeFeature(tracks: FeatureTrack[] = []): FeatureSummary {
  return {
    id: 1,
    title: 'Test feature',
    description: null,
    state: 'Development',
    plannedStart: null,
    plannedEnd: null,
    leadUserId: 1,
    managerUserId: 1,
    taskCount: 0,
    taskIds: [],
    version: 0,
    tracks,
  };
}

function makeFrontendTrack(overrides: Partial<FeatureTrack> = {}): FeatureTrack {
  return {
    id: 1,
    featureId: 1,
    kind: 'Frontend',
    trackOwnerUserId: 11,
    version: 0,
    stages: [],
    ...overrides,
  };
}

function makeBackendTrack(overrides: Partial<FeatureTrack> = {}): FeatureTrack {
  return {
    id: 2,
    featureId: 1,
    kind: 'Backend',
    trackOwnerUserId: 12,
    version: 0,
    stages: [],
    ...overrides,
  };
}

describe('computeLifecycleStageWindow', () => {
  it('returns all-nulls for a feature with no tracks', () => {
    const feature = makeFeature([]);
    const result = computeLifecycleStageWindow(feature, 'Development');
    expect(result).toEqual({ stage: 'Development', plannedStart: null, plannedEnd: null, ownerUserId: null });
  });

  it('returns all-nulls for a feature with undefined tracks', () => {
    const feature: FeatureSummary = {
      id: 1, title: 't', description: null, state: 'CsApproving',
      plannedStart: null, plannedEnd: null,
      leadUserId: 1, managerUserId: 1, taskCount: 0, taskIds: [], version: 0,
    };
    const result = computeLifecycleStageWindow(feature, 'Development');
    expect(result).toEqual({ stage: 'Development', plannedStart: null, plannedEnd: null, ownerUserId: null });
  });

  it('returns the single track-stage row verbatim when only one track/stage contributes', () => {
    const feature = makeFeature([
      makeFrontendTrack({
        stages: [
          { stageKey: 'Development', plannedStart: '2026-06-01', plannedEnd: '2026-06-15', stageOwnerUserId: 11, stageVersion: 0 },
        ],
      }),
    ]);
    const result = computeLifecycleStageWindow(feature, 'Development');
    expect(result).toEqual({ stage: 'Development', plannedStart: '2026-06-01', plannedEnd: '2026-06-15', ownerUserId: null });
  });

  it('rolls up min(plannedStart) and max(plannedEnd) when both tracks contribute the same lifecycle stage', () => {
    const feature = makeFeature([
      makeFrontendTrack({
        stages: [
          { stageKey: 'Development', plannedStart: '2026-06-05', plannedEnd: '2026-06-10', stageOwnerUserId: 11, stageVersion: 0 },
        ],
      }),
      makeBackendTrack({
        stages: [
          { stageKey: 'Development', plannedStart: '2026-06-01', plannedEnd: '2026-06-15', stageOwnerUserId: 12, stageVersion: 0 },
        ],
      }),
    ]);
    const result = computeLifecycleStageWindow(feature, 'Development');
    expect(result.plannedStart).toBe('2026-06-01');
    expect(result.plannedEnd).toBe('2026-06-15');
    expect(result.ownerUserId).toBeNull();
  });

  it('treats null endpoints as absent contributors — null does not poison min/max', () => {
    const feature = makeFeature([
      makeFrontendTrack({
        stages: [
          { stageKey: 'Development', plannedStart: null, plannedEnd: '2026-06-10', stageOwnerUserId: null, stageVersion: 0 },
        ],
      }),
      makeBackendTrack({
        stages: [
          { stageKey: 'Development', plannedStart: '2026-06-01', plannedEnd: null, stageOwnerUserId: null, stageVersion: 0 },
        ],
      }),
    ]);
    const result = computeLifecycleStageWindow(feature, 'Development');
    expect(result.plannedStart).toBe('2026-06-01');
    expect(result.plannedEnd).toBe('2026-06-10');
  });

  it('is idempotent — calling twice with identical input yields equal results', () => {
    const feature = makeFeature([
      makeBackendTrack({
        stages: [
          { stageKey: 'Development', plannedStart: '2026-06-01', plannedEnd: '2026-06-15', stageOwnerUserId: 12, stageVersion: 0 },
        ],
      }),
    ]);
    const first = computeLifecycleStageWindow(feature, 'Development');
    const second = computeLifecycleStageWindow(feature, 'Development');
    expect(first).toEqual(second);
  });

  it('reads CsApproving lifecycle from the FE SrApproving stage-key', () => {
    const feature = makeFeature([
      makeFrontendTrack({
        stages: [
          { stageKey: 'SrApproving', plannedStart: '2026-05-01', plannedEnd: '2026-05-10', stageOwnerUserId: 1, stageVersion: 0 },
        ],
      }),
    ]);
    const result = computeLifecycleStageWindow(feature, 'CsApproving');
    expect(result).toEqual({ stage: 'CsApproving', plannedStart: '2026-05-01', plannedEnd: '2026-05-10', ownerUserId: null });
  });

  it('reads CsApproving lifecycle from the BE CsApproving stage-key', () => {
    const feature = makeFeature([
      makeBackendTrack({
        stages: [
          { stageKey: 'CsApproving', plannedStart: '2026-05-03', plannedEnd: '2026-05-08', stageOwnerUserId: 1, stageVersion: 0 },
        ],
      }),
    ]);
    const result = computeLifecycleStageWindow(feature, 'CsApproving');
    expect(result).toEqual({ stage: 'CsApproving', plannedStart: '2026-05-03', plannedEnd: '2026-05-08', ownerUserId: null });
  });

  it('returns all-nulls when no track stage matches the lifecycle stage mapping', () => {
    const feature = makeFeature([
      makeFrontendTrack({
        stages: [
          { stageKey: 'Development', plannedStart: '2026-06-01', plannedEnd: '2026-06-15', stageOwnerUserId: 11, stageVersion: 0 },
        ],
      }),
    ]);
    const result = computeLifecycleStageWindow(feature, 'CsApproving');
    expect(result).toEqual({ stage: 'CsApproving', plannedStart: null, plannedEnd: null, ownerUserId: null });
  });

  it('pre-filters by kind — a Backend track does not contribute SrApproving (FE-only key) to CsApproving rollup', () => {
    const feature = makeFeature([
      makeBackendTrack({
        stages: [
          { stageKey: 'SrApproving' as never, plannedStart: '2026-05-01', plannedEnd: '2026-05-10', stageOwnerUserId: 1, stageVersion: 0 },
        ],
      }),
    ]);
    const result = computeLifecycleStageWindow(feature, 'CsApproving');
    expect(result.plannedStart).toBeNull();
    expect(result.plannedEnd).toBeNull();
  });
});
