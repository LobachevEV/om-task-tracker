import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { __resetPlanFeaturesCache, usePlanFeatures } from './usePlanFeatures';
import type { FeatureSummary } from '../../shared/types/feature';
import type { ListFeaturesParams } from '../../shared/api/planApi';

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
    stagePlans: [
      {
        stage: 'CsApproving',
        plannedStart: null,
        plannedEnd: null,
        performerUserId: null,
      },
      { stage: 'Development', plannedStart, plannedEnd, performerUserId: null },
      { stage: 'Testing', plannedStart: null, plannedEnd: null, performerUserId: null },
      { stage: 'EthalonTesting', plannedStart: null, plannedEnd: null, performerUserId: null },
      { stage: 'LiveRelease', plannedStart: null, plannedEnd: null, performerUserId: null },
    ],
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
