import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachTask,
  createFeature,
  detachTask,
  getFeature,
  listFeatures,
} from '../../../src/common/api/planApi';
import { featureSummarySchema } from '../../../src/common/api/schemas';
import { setAuth } from '../../../src/common/auth/auth';
import { makeResponse } from '../../testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const emptyTaxonomy = {
  gates: [
    { id: 1, gateKey: 'spec' as const,                kind: 'spec' as const, track: null,                  status: 'approved' as const, requestedAtUtc: null, approverUserId: null, approvedAtUtc: null, rejectionReason: null, version: 0 },
    { id: 2, gateKey: 'backend.prep-gate' as const,   kind: 'sr' as const,   track: 'backend' as const,    status: 'approved' as const, requestedAtUtc: null, approverUserId: null, approvedAtUtc: null, rejectionReason: null, version: 0 },
    { id: 3, gateKey: 'frontend.prep-gate' as const,  kind: 'sr' as const,   track: 'frontend' as const,   status: 'approved' as const, requestedAtUtc: null, approverUserId: null, approvedAtUtc: null, rejectionReason: null, version: 0 },
  ],
  tracks: [
    {
      track: 'backend' as const,
      phases: [
        { phase: 'development' as const,     multiOwner: true,  cap: 6, subStages: [] },
        { phase: 'stand-testing' as const,   multiOwner: true,  cap: 6, subStages: [] },
        { phase: 'ethalon-testing' as const, multiOwner: false, cap: 1, subStages: [] },
        { phase: 'live-release' as const,    multiOwner: false, cap: 1, subStages: [] },
      ],
    },
    {
      track: 'frontend' as const,
      phases: [
        { phase: 'development' as const,     multiOwner: true,  cap: 6, subStages: [] },
        { phase: 'stand-testing' as const,   multiOwner: true,  cap: 6, subStages: [] },
        { phase: 'ethalon-testing' as const, multiOwner: false, cap: 1, subStages: [] },
        { phase: 'live-release' as const,    multiOwner: false, cap: 1, subStages: [] },
      ],
    },
  ],
};

const sampleSummary = {
  id: 1,
  title: 'Feature A',
  description: null,
  state: 'CsApproving' as const,
  plannedStart: null,
  plannedEnd: null,
  leadUserId: 1,
  managerUserId: 2,
  taskCount: 0,
  taskIds: [] as number[],
  taxonomy: emptyTaxonomy,
  version: 0,
};

const sampleDetail = {
  feature: sampleSummary,
  tasks: [],
  lead: { userId: 1, email: 'lead@example.com', displayName: 'Lead', role: 'Manager' as const },
  miniTeam: [],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'Manager' });
});

describe('listFeatures', () => {
  it('calls GET /api/plan/features with no query string when params empty', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, [sampleSummary]));

    await listFeatures({});

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/\/api\/plan\/features$/);
  });

  it('adds scope=mine to the query string', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, [sampleSummary]));

    await listFeatures({ scope: 'mine' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/api/plan/features?scope=mine');
  });

  it('adds scope and state when both provided', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, [sampleSummary]));

    await listFeatures({ scope: 'mine', state: 'Development' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('scope=mine');
    expect(url).toContain('state=Development');
  });

  it('sends Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, [sampleSummary]));

    await listFeatures({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
    );
  });

  it('rejects when schema validation fails (missing taskIds)', async () => {
    const bad = { ...sampleSummary } as Record<string, unknown>;
    delete bad.taskIds;
    mockFetch.mockResolvedValueOnce(makeResponse(200, [bad]));

    await expect(listFeatures({})).rejects.toThrow();
  });
});

describe('getFeature', () => {
  it('calls GET /api/plan/features/{id}', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleDetail));

    await getFeature(42);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plan/features/42'),
      expect.any(Object),
    );
  });
});

describe('createFeature', () => {
  it('sends POST /api/plan/features with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await createFeature({ title: 'X' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plan/features'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: 'X' }),
      }),
    );
  });
});

describe('attachTask', () => {
  it('calls POST /api/plan/features/{id}/tasks/{jiraId}', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await attachTask(42, 'PROJ-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plan/features/42/tasks/PROJ-1'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('URL-encodes the jiraId segment', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await attachTask(42, 'PROJ/1 2');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('PROJ%2F1%202');
  });
});

describe('detachTask', () => {
  it('calls DELETE /api/plan/features/{id}/tasks/{jiraId}', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await detachTask(42, 'PROJ-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plan/features/42/tasks/PROJ-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('featureSummarySchema', () => {
  it('normalizes empty-string description to null', () => {
    const parsed = featureSummarySchema.parse({ ...sampleSummary, description: '' });
    expect(parsed.description).toBeNull();
  });

  it('accepts ISO date YYYY-MM-DD for plannedStart', () => {
    const parsed = featureSummarySchema.parse({ ...sampleSummary, plannedStart: '2026-04-30' });
    expect(parsed.plannedStart).toBe('2026-04-30');
  });

  it('rejects non-ISO date format for plannedStart', () => {
    expect(() =>
      featureSummarySchema.parse({ ...sampleSummary, plannedStart: '2026/04/30' }),
    ).toThrow();
  });
});
