import { describe, it, expect } from 'vitest';
import { deriveIntegrations } from '../integrationStatus';
import type { Task } from '../../../shared/types/task';

describe('deriveIntegrations', () => {
  it('returns jira waiting indicator for NotStarted state', () => {
    const task: Task = { id: 1, jiraId: 'PROJ-1', state: 'NotStarted', userId: 1 };
    const indicators = deriveIntegrations(task);

    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toEqual({
      kind: 'jira',
      signal: 'waiting',
      tooltip: expect.stringContaining('Ожидает'),
    });
  });

  it('returns git waiting indicator for InDev state', () => {
    const task: Task = { id: 1, jiraId: 'PROJ-1', state: 'InDev', userId: 1 };
    const indicators = deriveIntegrations(task);

    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toEqual({
      kind: 'git',
      signal: 'waiting',
      tooltip: expect.stringContaining('Разработка'),
    });
  });

  it('returns git and confluence waiting indicators for MrToRelease state', () => {
    const task: Task = { id: 1, jiraId: 'PROJ-1', state: 'MrToRelease', userId: 1 };
    const indicators = deriveIntegrations(task);

    expect(indicators).toHaveLength(2);
    expect(indicators[0]).toEqual({
      kind: 'git',
      signal: 'waiting',
      tooltip: expect.stringContaining('MR'),
    });
    expect(indicators[1]).toEqual({
      kind: 'confluence',
      signal: 'waiting',
      tooltip: expect.stringContaining('Ожидает'),
    });
  });

  it('returns jira waiting indicator for InTest state', () => {
    const task: Task = { id: 1, jiraId: 'PROJ-1', state: 'InTest', userId: 1 };
    const indicators = deriveIntegrations(task);

    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toEqual({
      kind: 'jira',
      signal: 'waiting',
      tooltip: expect.stringContaining('QA'),
    });
  });

  it('returns git waiting indicator for MrToMaster state', () => {
    const task: Task = { id: 1, jiraId: 'PROJ-1', state: 'MrToMaster', userId: 1 };
    const indicators = deriveIntegrations(task);

    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toEqual({
      kind: 'git',
      signal: 'waiting',
      tooltip: expect.stringContaining('MR в master'),
    });
  });

  it('returns git passed indicator for Completed state', () => {
    const task: Task = { id: 1, jiraId: 'PROJ-1', state: 'Completed', userId: 1 };
    const indicators = deriveIntegrations(task);

    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toEqual({
      kind: 'git',
      signal: 'passed',
      tooltip: expect.stringContaining('Слито'),
    });
  });
});
