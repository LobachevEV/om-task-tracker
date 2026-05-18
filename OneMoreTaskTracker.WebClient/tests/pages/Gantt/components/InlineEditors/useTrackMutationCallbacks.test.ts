import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTrackMutationCallbacks } from '../../../../../src/pages/Gantt/components/InlineEditors/useTrackMutationCallbacks';

vi.mock('../../../../../src/common/api/planApi', () => ({
  patchFeatureTrack: vi.fn().mockResolvedValue(undefined),
  patchFeatureTrackStage: vi.fn().mockResolvedValue(undefined),
}));

import * as planApi from '../../../../../src/common/api/planApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTrackMutationCallbacks — optimistic stageVersion bump', () => {
  it('saveTrackStageOwner passes stageVersion + 1 to onStageApplied', async () => {
    const onStageApplied = vi.fn();
    const { result } = renderHook(() =>
      useTrackMutationCallbacks({ onStageApplied }),
    );

    await act(async () => {
      await result.current.saveTrackStageOwner(1, 'Frontend', 'Development', 42, 5);
    });

    expect(planApi.patchFeatureTrackStage).toHaveBeenCalledWith(1, 'Frontend', 'Development', {
      stageOwnerUserId: 42,
      expectedStageVersion: 5,
    });
    expect(onStageApplied).toHaveBeenCalledWith(1, 'Frontend', 'Development', {
      stageOwnerUserId: 42,
      stageVersion: 6,
    });
  });

  it('saveTrackStagePlannedStart passes stageVersion + 1 to onStageApplied', async () => {
    const onStageApplied = vi.fn();
    const { result } = renderHook(() =>
      useTrackMutationCallbacks({ onStageApplied }),
    );

    await act(async () => {
      await result.current.saveTrackStagePlannedStart(2, 'Backend', 'StandTesting', '2026-06-01', 3);
    });

    expect(onStageApplied).toHaveBeenCalledWith(2, 'Backend', 'StandTesting', {
      plannedStart: '2026-06-01',
      stageVersion: 4,
    });
  });

  it('saveTrackStagePlannedEnd passes stageVersion + 1 to onStageApplied', async () => {
    const onStageApplied = vi.fn();
    const { result } = renderHook(() =>
      useTrackMutationCallbacks({ onStageApplied }),
    );

    await act(async () => {
      await result.current.saveTrackStagePlannedEnd(3, 'Frontend', 'EthalonTesting', '2026-07-15', 0);
    });

    expect(onStageApplied).toHaveBeenCalledWith(3, 'Frontend', 'EthalonTesting', {
      plannedEnd: '2026-07-15',
      stageVersion: 1,
    });
  });

  it('saveTrackStageRange passes stageVersion + 1 to onStageApplied', async () => {
    const onStageApplied = vi.fn();
    const { result } = renderHook(() =>
      useTrackMutationCallbacks({ onStageApplied }),
    );

    const range = { plannedStart: '2026-04-01', plannedEnd: '2026-04-30' };
    await act(async () => {
      await result.current.saveTrackStageRange(4, 'Backend', 'Development', range, 7);
    });

    expect(onStageApplied).toHaveBeenCalledWith(4, 'Backend', 'Development', {
      plannedStart: '2026-04-01',
      plannedEnd: '2026-04-30',
      stageVersion: 8,
    });
  });

  it('does not call onStageApplied when patchFeatureTrackStage throws', async () => {
    vi.mocked(planApi.patchFeatureTrackStage).mockRejectedValueOnce(new Error('409 Conflict'));
    const onStageApplied = vi.fn();
    const { result } = renderHook(() =>
      useTrackMutationCallbacks({ onStageApplied }),
    );

    await act(async () => {
      await result.current.saveTrackStagePlannedStart(1, 'Frontend', 'Development', '2026-05-01', 2).catch(() => {});
    });

    expect(onStageApplied).not.toHaveBeenCalled();
  });

  it('version bump is monotonic: second save uses bumped version correctly', async () => {
    const patches: Array<{ stageVersion: number }> = [];
    const onStageApplied = vi.fn((_fid, _kind, _key, patch) => {
      patches.push(patch as { stageVersion: number });
    });
    const { result } = renderHook(() =>
      useTrackMutationCallbacks({ onStageApplied }),
    );

    await act(async () => {
      await result.current.saveTrackStagePlannedStart(1, 'Frontend', 'Development', '2026-05-01', 0);
    });
    await act(async () => {
      await result.current.saveTrackStagePlannedStart(1, 'Frontend', 'Development', '2026-05-02', patches[0].stageVersion);
    });

    expect(patches[0].stageVersion).toBe(1);
    expect(patches[1].stageVersion).toBe(2);
  });
});
