import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchFeature } from '../../../src/common/api/planApi';
import {
  patchFeatureRequestSchema,
  featureSummarySchema,
} from '../../../src/common/api/schemas';
import { setAuth } from '../../../src/common/auth/auth';
import { makeResponse } from '../../testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const emptyStagePlans = [
  { stage: 'CsApproving' as const,    plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'Development' as const,    plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'Testing' as const,        plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'EthalonTesting' as const, plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'LiveRelease' as const,    plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
];

const sampleSummary = {
  id: 7,
  title: 'Feature P',
  description: null,
  state: 'CsApproving' as const,
  plannedStart: null,
  plannedEnd: null,
  leadUserId: 9,
  managerUserId: 1,
  taskCount: 0,
  taskIds: [] as number[],
  stagePlans: emptyStagePlans,
  version: 3,
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setAuth({ token: 'patch-token', userId: 1, email: 'mgr@example.com', role: 'Manager' });
});

describe('patchFeature', () => {
  it('sends PATCH /api/plan/features/{id} to the consolidated endpoint', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeature(7, { title: 'Renamed', expectedVersion: 3 });

    const url = mockFetch.mock.calls[0][0] as string;
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(url).toMatch(/\/api\/plan\/features\/7$/);
    expect(init.method).toBe('PATCH');
  });

  it('sends only the changed field in the body (sparse payload)', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeature(7, { title: 'Renamed', expectedVersion: 3 });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ title: 'Renamed', expectedVersion: 3 });
    expect(body).not.toHaveProperty('description');
    expect(body).not.toHaveProperty('leadUserId');
  });

  it('forwards expectedVersion as If-Match header', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeature(7, { leadUserId: 42, expectedVersion: 5 });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['If-Match']).toBe('5');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toBe('Bearer patch-token');
  });

  it('omits If-Match header when expectedVersion is absent', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeature(7, { description: 'Edited' });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['If-Match']).toBeUndefined();
  });

  it('serializes a null description (clear-description semantics)', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeature(7, { description: null, expectedVersion: 0 });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.description).toBeNull();
  });

  it('returns the parsed FeatureSummary', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    const result = await patchFeature(7, { title: 'X', expectedVersion: 3 });

    expect(result.id).toBe(7);
    expect(result.title).toBe('Feature P');
    expect(result.version).toBe(3);
  });

  it('rejects when the response fails schema validation', async () => {
    const bad = { ...sampleSummary, taskIds: undefined };
    mockFetch.mockResolvedValueOnce(makeResponse(200, bad));

    await expect(patchFeature(7, { title: 'X' })).rejects.toThrow();
  });
});

describe('patchFeatureRequestSchema', () => {
  it('accepts a sparse title-only request', () => {
    const parsed = patchFeatureRequestSchema.parse({ title: 'New' });
    expect(parsed.title).toBe('New');
  });

  it('accepts a description-only request with expectedVersion', () => {
    const parsed = patchFeatureRequestSchema.parse({
      description: 'doc',
      expectedVersion: 2,
    });
    expect(parsed.description).toBe('doc');
    expect(parsed.expectedVersion).toBe(2);
  });

  it('accepts an empty object (no fields touched)', () => {
    expect(() => patchFeatureRequestSchema.parse({})).not.toThrow();
  });

  it('rejects an empty title', () => {
    expect(() => patchFeatureRequestSchema.parse({ title: '' })).toThrow();
  });

  it('rejects a non-positive leadUserId', () => {
    expect(() => patchFeatureRequestSchema.parse({ leadUserId: 0 })).toThrow();
  });

  it('allows description=null (clear semantics)', () => {
    const parsed = patchFeatureRequestSchema.parse({ description: null });
    expect(parsed.description).toBeNull();
  });
});

describe('featureSummarySchema', () => {
  it('parses the consolidated PATCH response shape (re-uses summary schema)', () => {
    const parsed = featureSummarySchema.parse(sampleSummary);
    expect(parsed.id).toBe(7);
  });
});
