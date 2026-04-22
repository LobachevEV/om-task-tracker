import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTeamRoster, __resetTeamRosterCache } from './useTeamRoster';
import type { TeamRosterMember } from '../../shared/api/teamApi';

const ROSTER: TeamRosterMember[] = [
  {
    userId: 1,
    email: 'm@example.com',
    role: 'Manager',
    managerId: null,
    displayName: 'M',
    isSelf: true,
    status: {
      active: 0,
      lastActive: null,
      mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 },
    },
  },
];

beforeEach(() => {
  __resetTeamRosterCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTeamRoster', () => {
  it('surfaces an Error when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTeamRoster({ fetcher }));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('refetch() re-runs the fetcher and clears a previous error on success', async () => {
    const fetcher = vi
      .fn<() => Promise<TeamRosterMember[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(ROSTER);

    const { result } = renderHook(() => useTeamRoster({ fetcher }));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual(ROSTER);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('auto-refetches on window focus when the previous attempt errored', async () => {
    const fetcher = vi
      .fn<() => Promise<TeamRosterMember[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(ROSTER);

    const { result } = renderHook(() => useTeamRoster({ fetcher }));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(ROSTER);
      expect(result.current.error).toBeNull();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does NOT auto-refetch on window focus when there is no error', async () => {
    const fetcher = vi
      .fn<() => Promise<TeamRosterMember[]>>()
      .mockResolvedValue(ROSTER);

    const { result } = renderHook(() => useTeamRoster({ fetcher }));

    await waitFor(() => {
      expect(result.current.data).toEqual(ROSTER);
    });

    const callsBeforeFocus = fetcher.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(callsBeforeFocus);
  });
});
