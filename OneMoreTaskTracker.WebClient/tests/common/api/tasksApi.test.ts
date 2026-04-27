import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTasks, fetchTaskDetail, moveTask, createTask } from '../../../src/common/api/tasksApi';
import { setAuth, clearAuth } from '../../../src/common/auth/auth';
import type { CreateTaskPayload } from '../../../src/common/types/task';
import { makeResponse } from '../../testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('fetchTasks', () => {
  it('calls GET /api/tasks with auth header', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const responseData = [
      { id: 1, jiraId: 'PROJ-1', state: 'NotStarted', userId: 1 },
      { id: 2, jiraId: 'PROJ-2', state: 'InDev', userId: 1 },
    ];
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await fetchTasks();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    );
  });

  it('returns parsed task list', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const responseData = [
      { id: 1, jiraId: 'PROJ-1', state: 'NotStarted', userId: 1 },
      { id: 2, jiraId: 'PROJ-2', state: 'Completed', userId: 1 },
    ];
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await fetchTasks();

    expect(result).toHaveLength(2);
    expect(result[0].jiraId).toBe('PROJ-1');
    expect(result[1].state).toBe('Completed');
  });

  it('works without auth token', async () => {
    clearAuth();
    const responseData: never[] = [];
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await fetchTasks();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {},
      }),
    );
  });
});

describe('fetchTaskDetail', () => {
  it('calls correct URL for task detail', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const responseData = {
      jiraId: 'PROJ-42',
      state: 'InDev',
      projects: [{ id: 10, name: 'repo' }],
      mergeRequests: [],
    };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await fetchTaskDetail('PROJ-42');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks/PROJ-42'),
      expect.any(Object),
    );
  });

  it('encodes special characters in jiraId', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const responseData = {
      jiraId: 'PROJ-1/SUB',
      state: 'NotStarted',
      projects: [],
      mergeRequests: [],
    };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await fetchTaskDetail('PROJ-1/SUB');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('PROJ-1%2FSUB'),
      expect.any(Object),
    );
  });

  it('returns parsed task detail', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const responseData = {
      jiraId: 'PROJ-1',
      state: 'InDev',
      projects: [{ id: 1, name: 'my-repo' }],
      mergeRequests: [{ id: '1', title: 'Fix bug', sourceBranch: 'fix', targetBranch: 'main' }],
    };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await fetchTaskDetail('PROJ-1');

    expect(result.jiraId).toBe('PROJ-1');
    expect(result.projects).toHaveLength(1);
    expect(result.mergeRequests).toHaveLength(1);
  });
});

describe('moveTask', () => {
  it('sends POST to /move endpoint', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const responseData = { state: 'InDev' as const, projects: [] };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await moveTask('PROJ-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks/PROJ-1/move'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('returns parsed move result', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const responseData = { state: 'InDev' as const, projects: [{ id: 1, name: 'repo' }] };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await moveTask('PROJ-1');

    expect(result.state).toBe('InDev');
    expect(result.projects).toHaveLength(1);
  });
});

describe('createTask', () => {
  it('sends POST to /api/tasks with payload including featureId', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const payload: CreateTaskPayload = { jiraId: 'PROJ-NEW', featureId: 7 };
    const responseData = { id: 10, jiraId: 'PROJ-NEW', state: 'NotStarted', userId: 1 };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await createTask(payload);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      }),
    );
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
    expect(body.featureId).toBe(7);
    expect(body.jiraId).toBe('PROJ-NEW');
  });

  it('includes auth header in create request', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const payload: CreateTaskPayload = { jiraId: 'PROJ-NEW', featureId: 7 };
    const responseData = { id: 10, jiraId: 'PROJ-NEW', state: 'NotStarted', userId: 1 };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await createTask(payload);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('returns parsed created task', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const payload: CreateTaskPayload = { jiraId: 'PROJ-NEW', featureId: 7 };
    const responseData = { id: 10, jiraId: 'PROJ-NEW', state: 'NotStarted', userId: 1 };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await createTask(payload);

    expect(result.id).toBe(10);
    expect(result.jiraId).toBe('PROJ-NEW');
  });

  it('rejects the old payload shape at compile time (spec 06 §310)', () => {
    // @ts-expect-error CreateTaskPayload now requires featureId.
    const legacy: CreateTaskPayload = { jiraId: 'PROJ-NEW' };
    expect(legacy.jiraId).toBe('PROJ-NEW');
  });
});
