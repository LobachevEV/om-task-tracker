import { describe, expect, it } from 'vitest';
import { selectStagesForKind } from '../../../src/pages/Gantt/selectStagesForKind';
import type { FeatureTrackStage } from '../../../src/common/types/featureTrack';

function makeStage(stageKey: string): FeatureTrackStage {
  return {
    stageKey: stageKey as FeatureTrackStage['stageKey'],
    plannedStart: null,
    plannedEnd: null,
    stageOwnerUserId: null,
    stageVersion: 1,
  };
}

describe('selectStagesForKind', () => {
  it('returns all 5 frontend stages when all are present', () => {
    const stages = [
      makeStage('SrApproving'),
      makeStage('Development'),
      makeStage('StandTesting'),
      makeStage('EthalonTesting'),
      makeStage('ReleaseToLive'),
    ];
    const result = selectStagesForKind(stages, 'Frontend');
    expect(result).toHaveLength(5);
  });

  it('excludes CsApproving when kind is Frontend', () => {
    const stages = [
      makeStage('CsApproving'),
      makeStage('SrApproving'),
      makeStage('Development'),
      makeStage('StandTesting'),
      makeStage('EthalonTesting'),
      makeStage('ReleaseToLive'),
    ];
    const result = selectStagesForKind(stages, 'Frontend');
    expect(result.map((s) => s.stageKey)).not.toContain('CsApproving');
    expect(result).toHaveLength(5);
  });

  it('excludes SrApproving when kind is Backend', () => {
    const stages = [
      makeStage('CsApproving'),
      makeStage('SrApproving'),
      makeStage('Development'),
      makeStage('StandTesting'),
      makeStage('EthalonTesting'),
      makeStage('ReleaseToLive'),
    ];
    const result = selectStagesForKind(stages, 'Backend');
    expect(result.map((s) => s.stageKey)).not.toContain('SrApproving');
    expect(result).toHaveLength(5);
  });

  it('returns empty array for empty input', () => {
    expect(selectStagesForKind([], 'Frontend')).toHaveLength(0);
    expect(selectStagesForKind([], 'Backend')).toHaveLength(0);
  });

  it('preserves original order of stages', () => {
    const stages = [
      makeStage('Development'),
      makeStage('SrApproving'),
      makeStage('EthalonTesting'),
    ];
    const result = selectStagesForKind(stages, 'Frontend');
    expect(result.map((s) => s.stageKey)).toEqual(['Development', 'SrApproving', 'EthalonTesting']);
  });
});
