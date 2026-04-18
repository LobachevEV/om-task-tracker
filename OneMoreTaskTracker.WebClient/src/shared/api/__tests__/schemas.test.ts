import { describe, it, expect } from 'vitest';
import {
  authResponseSchema,
  taskSchema,
  taskListSchema,
  taskDetailSchema,
  projectSchema,
  mergeRequestSchema,
} from '../schemas';

describe('authResponseSchema', () => {
  it('parses a valid auth response', () => {
    const data = {
      token: 'jwt.token.here',
      userId: 1,
      email: 'user@example.com',
      role: 'FrontendDeveloper',
    };
    const result = authResponseSchema.parse(data);
    expect(result.token).toBe('jwt.token.here');
    expect(result.role).toBe('FrontendDeveloper');
  });

  it('rejects an invalid role', () => {
    const data = { token: 'x', userId: 1, email: 'a@b.com', role: 'Admin' };
    expect(() => authResponseSchema.parse(data)).toThrow();
  });

  it('rejects a missing token', () => {
    const data = { userId: 1, email: 'a@b.com', role: 'FrontendDeveloper' };
    expect(() => authResponseSchema.parse(data)).toThrow();
  });
});

describe('taskSchema', () => {
  it('parses a valid task', () => {
    const data = { id: 5, jiraId: 'PROJ-42', state: 'InDev', userId: 7 };
    const result = taskSchema.parse(data);
    expect(result.id).toBe(5);
    expect(result.state).toBe('InDev');
    expect(result.userId).toBe(7);
  });

  it('rejects an unknown state', () => {
    const data = { id: 1, jiraId: 'X-1', state: 'Unknown', userId: 1 };
    expect(() => taskSchema.parse(data)).toThrow();
  });

  it('rejects missing userId', () => {
    const data = { id: 1, jiraId: 'X-1', state: 'InDev' };
    expect(() => taskSchema.parse(data)).toThrow();
  });
});

describe('taskListSchema', () => {
  it('parses an array of tasks', () => {
    const data = [
      { id: 1, jiraId: 'A-1', state: 'NotStarted', userId: 1 },
      { id: 2, jiraId: 'A-2', state: 'Completed', userId: 2 },
    ];
    const result = taskListSchema.parse(data);
    expect(result).toHaveLength(2);
  });

  it('parses an empty array', () => {
    expect(taskListSchema.parse([])).toEqual([]);
  });
});

describe('projectSchema', () => {
  it('parses a valid project', () => {
    const result = projectSchema.parse({ id: 1, name: 'my-repo' });
    expect(result.name).toBe('my-repo');
  });
});

describe('mergeRequestSchema', () => {
  it('parses a valid MR', () => {
    const data = { id: '42', title: 'Fix bug', sourceBranch: 'fix/x', targetBranch: 'release' };
    const result = mergeRequestSchema.parse(data);
    expect(result.title).toBe('Fix bug');
  });
});

describe('taskDetailSchema', () => {
  it('parses a full task detail', () => {
    const data = {
      jiraId: 'PROJ-1',
      state: 'InDev',
      projects: [{ id: 10, name: 'repo' }],
      mergeRequests: [],
    };
    const result = taskDetailSchema.parse(data);
    expect(result.jiraId).toBe('PROJ-1');
    expect(result.projects).toHaveLength(1);
  });

  it('parses a detail with no projects or MRs', () => {
    const data = { jiraId: 'X-1', state: 'NotStarted', projects: [], mergeRequests: [] };
    const result = taskDetailSchema.parse(data);
    expect(result.mergeRequests).toHaveLength(0);
  });

  it('rejects an invalid state', () => {
    const data = { jiraId: 'X-1', state: 'Bogus', projects: [], mergeRequests: [] };
    expect(() => taskDetailSchema.parse(data)).toThrow();
  });
});
