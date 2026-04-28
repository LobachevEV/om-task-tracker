import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchFeatureStage } from '../../../src/common/api/planApi';
import { patchFeatureStageRequestSchema } from '../../../src/common/api/schemas';
import { setAuth } from '../../../src/common/auth/auth';
import { makeResponse } from '../../testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const emptyStagePlans = [
  { stage: 'CsApproving' as const,    plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'Development' as const,    plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 1 },
  { stage: 'Testing' as const,        plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'EthalonTesting' as const, plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'LiveRelease' as const,    plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
];

const sampleSummary = {
  id: 11,
  title: 'Feature S',
  description: null,
  state: 'Development' as const,
  plannedStart: '2026-05-01',
  plannedEnd: '2026-05-31',
  leadUserId: 9,
  managerUserId: 1,
  taskCount: 0,
  taskIds: [] as number[],
  stagePlans: emptyStagePlans,
  version: 4,
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setAuth({ token: 'stage-token', userId: 1, email: 'mgr@example.com', role: 'Manager' });
});

describe('patchFeatureStage', () => {
  it('sends PATCH to /api/plan/features/{id}/stages/{stage} (no per-field segment)', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeatureStage(11, 'Development', {
      stageOwnerUserId: 42,
      expectedStageVersion: 1,
    });

    const url = mockFetch.mock.calls[0][0] as string;
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(url).toMatch(/\/api\/plan\/features\/11\/stages\/Development$/);
    expect(url).not.toContain('/owner');
    expect(url).not.toContain('/planned-start');
    expect(url).not.toContain('/planned-end');
    expect(init.method).toBe('PATCH');
  });

  it('sends only the changed field in the body when only owner changes', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeatureStage(11, 'Development', {
      stageOwnerUserId: 42,
      expectedStageVersion: 1,
    });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ stageOwnerUserId: 42, expectedStageVersion: 1 });
    expect(body).not.toHaveProperty('plannedStart');
    expect(body).not.toHaveProperty('plannedEnd');
  });

  it('sends only plannedStart when only the start date changes', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeatureStage(11, 'Testing', {
      plannedStart: '2026-06-01',
      expectedStageVersion: 0,
    });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ plannedStart: '2026-06-01', expectedStageVersion: 0 });
    expect(body).not.toHaveProperty('stageOwnerUserId');
    expect(body).not.toHaveProperty('plannedEnd');
  });

  it('serializes stageOwnerUserId=null as clear-owner', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeatureStage(11, 'EthalonTesting', {
      stageOwnerUserId: null,
      expectedStageVersion: 2,
    });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.stageOwnerUserId).toBeNull();
  });

  it('forwards expectedStageVersion as If-Match header', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeatureStage(11, 'Development', {
      plannedEnd: '2026-07-15',
      expectedStageVersion: 9,
    });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['If-Match']).toBe('9');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toBe('Bearer stage-token');
  });

  it('omits If-Match when expectedStageVersion is absent', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await patchFeatureStage(11, 'Development', { plannedEnd: '2026-07-15' });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['If-Match']).toBeUndefined();
  });

  it('returns the parsed FeatureSummary on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    const result = await patchFeatureStage(11, 'Development', {
      stageOwnerUserId: 42,
      expectedStageVersion: 1,
    });

    expect(result.id).toBe(11);
    expect(result.state).toBe('Development');
  });

  it('propagates network failure (4xx) from the gateway', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(409, { error: 'version mismatch' }),
    );

    await expect(
      patchFeatureStage(11, 'Development', {
        stageOwnerUserId: 42,
        expectedStageVersion: 0,
      }),
    ).rejects.toThrow();
  });
});

describe('patchFeatureStageRequestSchema', () => {
  it('accepts a sparse owner-only request', () => {
    const parsed = patchFeatureStageRequestSchema.parse({
      stageOwnerUserId: 42,
      expectedStageVersion: 1,
    });
    expect(parsed.stageOwnerUserId).toBe(42);
    expect(parsed.expectedStageVersion).toBe(1);
  });

  it('accepts a plannedStart-only request', () => {
    const parsed = patchFeatureStageRequestSchema.parse({
      plannedStart: '2026-05-01',
    });
    expect(parsed.plannedStart).toBe('2026-05-01');
  });

  it('accepts an empty object (no fields touched)', () => {
    expect(() => patchFeatureStageRequestSchema.parse({})).not.toThrow();
  });

  it('allows stageOwnerUserId=null (clear owner)', () => {
    const parsed = patchFeatureStageRequestSchema.parse({
      stageOwnerUserId: null,
    });
    expect(parsed.stageOwnerUserId).toBeNull();
  });

  it('rejects a non-positive stageOwnerUserId', () => {
    expect(() =>
      patchFeatureStageRequestSchema.parse({ stageOwnerUserId: 0 }),
    ).toThrow();
  });

  it('rejects a non-ISO planned date', () => {
    expect(() =>
      patchFeatureStageRequestSchema.parse({ plannedStart: '01-01-2026' }),
    ).toThrow();
  });

  it('allows plannedStart=null (clear-start semantics)', () => {
    const parsed = patchFeatureStageRequestSchema.parse({ plannedStart: null });
    expect(parsed.plannedStart).toBeNull();
  });

  it('rejects a negative expectedStageVersion', () => {
    expect(() =>
      patchFeatureStageRequestSchema.parse({ expectedStageVersion: -1 }),
    ).toThrow();
  });
});
