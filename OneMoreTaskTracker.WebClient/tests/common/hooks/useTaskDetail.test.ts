import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as tasksApi from '../../../src/common/api/tasksApi';
import { useTaskDetail } from '../../../src/common/hooks/useTaskDetail';
import type { TaskDetail } from '../../../src/common/types/task';

const mockDetail: TaskDetail = {
  jiraId: 'PROJ-1',
  state: 'InDev',
  projects: [{ id: 1, name: 'my-repo' }],
  mergeRequests: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useTaskDetail', () => {
  it('returns the task detail on success', async () => {
    vi.spyOn(tasksApi, 'fetchTaskDetail').mockResolvedValue(mockDetail);

    const { result } = renderHook(() => useTaskDetail('PROJ-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.task).toEqual(mockDetail);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    vi.spyOn(tasksApi, 'fetchTaskDetail').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTaskDetail('PROJ-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.task).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('starts in loading state', () => {
    vi.spyOn(tasksApi, 'fetchTaskDetail').mockResolvedValue(mockDetail);
    const { result } = renderHook(() => useTaskDetail('PROJ-1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.task).toBeNull();
  });
});
