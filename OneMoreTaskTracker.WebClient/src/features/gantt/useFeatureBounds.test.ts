import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { __resetFeatureBoundsCache, useFeatureBounds } from './useFeatureBounds';

describe('useFeatureBounds', () => {
  beforeEach(() => __resetFeatureBoundsCache());
  afterEach(() => {
    __resetFeatureBoundsCache();
    vi.restoreAllMocks();
  });

  it('hydrates bounds from the fetcher', async () => {
    const fetcher = vi.fn(async () => ({
      earliestPlannedStart: '2026-01-01',
      latestPlannedEnd: '2026-12-31',
    }));
    const { result } = renderHook(() => useFeatureBounds({ fetcher }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bounds).toEqual({
      earliestPlannedStart: '2026-01-01',
      latestPlannedEnd: '2026-12-31',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('uses the module cache across mounts (singleton)', async () => {
    const fetcher = vi.fn(async () => ({
      earliestPlannedStart: '2026-01-01',
      latestPlannedEnd: '2026-06-30',
    }));
    const first = renderHook(() => useFeatureBounds({ fetcher }));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useFeatureBounds({ fetcher }));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.bounds?.latestPlannedEnd).toBe('2026-06-30');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalidate forces a fresh fetch on next mount', async () => {
    const first = vi.fn(async () => ({
      earliestPlannedStart: '2026-01-01',
      latestPlannedEnd: '2026-06-30',
    }));
    const second = vi.fn(async () => ({
      earliestPlannedStart: '2026-01-01',
      latestPlannedEnd: '2027-01-31',
    }));
    const fetcher = vi.fn(async () => first());
    const { result, rerender } = renderHook(({ f }) => useFeatureBounds({ fetcher: f }), {
      initialProps: { f: fetcher },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bounds?.latestPlannedEnd).toBe('2026-06-30');

    act(() => {
      result.current.invalidate();
    });
    rerender({ f: second });
    await waitFor(() => expect(result.current.bounds?.latestPlannedEnd).toBe('2027-01-31'));
  });

  it('surfaces errors and clears them on a successful refetch', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        earliestPlannedStart: '2026-01-01',
        latestPlannedEnd: '2026-12-31',
      });
    const { result } = renderHook(() => useFeatureBounds({ fetcher }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.bounds).not.toBeNull());
  });
});
