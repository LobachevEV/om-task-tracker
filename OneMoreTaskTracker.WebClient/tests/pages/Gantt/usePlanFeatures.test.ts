import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { __resetPlanFeaturesCache, usePlanFeatures } from '../../../src/pages/Gantt/usePlanFeatures';
import type { FeatureSummary, MiniTeamMember } from '../../../src/common/types/feature';
import type { FeatureTrack } from '../../../src/common/types/featureTrack';
import type { ListFeaturesParams } from '../../../src/common/api/planApi';

type Fetcher = (params: ListFeaturesParams) => Promise<FeatureSummary[]>;

function makeFeature(id: number, plannedStart: string, plannedEnd: string): FeatureSummary {
  return {
    id,
    title: `Feature ${id}`,
    description: null,
    state: 'Development',
    plannedStart,
    plannedEnd,
    leadUserId: 1,
    managerUserId: 1,
    taskCount: 0,
    taskIds: [],
    version: 0,
  };
}

describe('usePlanFeatures', () => {
  beforeEach(() => {
    __resetPlanFeaturesCache();
  });
  afterEach(() => {
    __resetPlanFeaturesCache();
    vi.restoreAllMocks();
  });

  it('hydrates from the initial fetcher and exposes the rows', async () => {
    const fetcher = vi.fn<Fetcher>(async () => [makeFeature(1, '2026-04-01', '2026-04-10')]);
    const { result } = renderHook(() =>
      usePlanFeatures({
        scope: 'mine',
        initialWindowStart: '2026-04-01',
        initialWindowEnd: '2026-04-30',
        fetcher,
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith({
      scope: 'mine',
      state: undefined,
      windowStart: '2026-04-01',
      windowEnd: '2026-04-30',
    });
  });

  it('loadChunk MERGES into the cached set instead of overwriting', async () => {
    const initial = [makeFeature(1, '2026-04-01', '2026-04-10')];
    const chunk = [makeFeature(2, '2026-05-01', '2026-05-10')];
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(chunk);
    const { result } = renderHook(() =>
      usePlanFeatures({ scope: 'mine', fetcher }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.map((r) => r.id)).toEqual([1]);

    await act(async () => {
      await result.current.loadChunk({
        windowStart: '2026-05-01',
        windowEnd: '2026-05-31',
      });
    });
    expect(result.current.data?.map((r) => r.id).sort()).toEqual([1, 2]);
  });

  it('cache key is scope|state — chunk re-fetch over loaded territory does not duplicate', async () => {
    const initial = [makeFeature(1, '2026-04-01', '2026-04-10')];
    const chunkAgain = [makeFeature(1, '2026-04-01', '2026-04-12')]; // updated dates
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(chunkAgain);
    const { result } = renderHook(() =>
      usePlanFeatures({ scope: 'mine', fetcher }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.loadChunk({
        windowStart: '2026-04-01',
        windowEnd: '2026-04-30',
      });
    });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].plannedEnd).toBe('2026-04-12');
  });

  it('forwards AbortSignal to the fetcher for cancel-on-pan', async () => {
    const fetcher = vi.fn<Fetcher>(async () => [makeFeature(1, '2026-04-01', '2026-04-10')]);
    const { result } = renderHook(() =>
      usePlanFeatures({ scope: 'mine', fetcher }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const ac = new AbortController();
    await act(async () => {
      await result.current.loadChunk({
        windowStart: '2026-05-01',
        windowEnd: '2026-05-31',
        signal: ac.signal,
      });
    });
    const lastCall = fetcher.mock.calls[fetcher.mock.calls.length - 1][0];
    expect(lastCall.signal).toBe(ac.signal);
  });

  it('applyTrackUpdate preserves nested trackOwner + stageOwner when PATCH response omits them (MB-001-01)', async () => {
    const owner: MiniTeamMember = { userId: 7, email: 'a@b.com', displayName: 'Alice', role: 'FrontendDeveloper' };
    const initialTrack: FeatureTrack = {
      id: 10, featureId: 1, kind: 'Frontend', trackOwnerUserId: 7, version: 1,
      trackOwner: owner,
      stages: [
        { stageKey: 'Development', plannedStart: '2026-04-08', plannedEnd: '2026-04-21', stageOwnerUserId: 7, stageVersion: 1, stageOwner: owner },
        { stageKey: 'StandTesting', plannedStart: null, plannedEnd: null, stageOwnerUserId: 7, stageVersion: 1, stageOwner: owner },
      ],
    };
    const featureWithTrack = makeFeature(1, '2026-04-01', '2026-04-30');
    const featureWithTrackAndTrackData: FeatureSummary = { ...featureWithTrack, tracks: [initialTrack] };
    const fetcher = vi.fn<Fetcher>(async () => [featureWithTrackAndTrackData]);
    const { result } = renderHook(() => usePlanFeatures({ scope: 'mine', fetcher }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const patchResponse: FeatureTrack = {
      id: 10, featureId: 1, kind: 'Frontend', trackOwnerUserId: 7, version: 2,
      stages: [
        { stageKey: 'Development', plannedStart: '2026-04-15', plannedEnd: '2026-04-21', stageOwnerUserId: 7, stageVersion: 2 },
        { stageKey: 'StandTesting', plannedStart: null, plannedEnd: null, stageOwnerUserId: 7, stageVersion: 1 },
      ],
    };
    act(() => { result.current.applyTrackUpdate(1, patchResponse); });

    const updatedTracks = result.current.data?.[0].tracks ?? [];
    const updatedTrack = updatedTracks.find((t) => t.kind === 'Frontend');
    expect(updatedTrack, 'Frontend track must survive the update').toBeDefined();
    expect(updatedTrack!.trackOwner, 'trackOwner must be preserved when PATCH omits it').toEqual(owner);
    const devStage = updatedTrack!.stages.find((s) => s.stageKey === 'Development');
    const standStage = updatedTrack!.stages.find((s) => s.stageKey === 'StandTesting');
    expect(devStage!.stageOwner, 'Development stageOwner must be preserved').toEqual(owner);
    expect(standStage!.stageOwner, 'StandTesting stageOwner must be preserved').toEqual(owner);
    expect(devStage!.plannedStart, 'scalar plannedStart must take next value').toBe('2026-04-15');
    expect(updatedTrack!.version, 'scalar version must take next value').toBe(2);
  });

  it('applyFeatureUpdate replaces a row in place without re-fetch', async () => {
    const original = makeFeature(1, '2026-04-01', '2026-04-10');
    const updated = { ...original, title: 'Renamed' };
    const fetcher = vi.fn<Fetcher>(async () => [original]);
    const { result } = renderHook(() =>
      usePlanFeatures({ scope: 'mine', fetcher }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.applyFeatureUpdate(updated);
    });
    expect(result.current.data?.[0].title).toBe('Renamed');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
