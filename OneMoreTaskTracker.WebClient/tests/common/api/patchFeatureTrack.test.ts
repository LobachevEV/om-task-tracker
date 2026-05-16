import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchFeatureTrack, patchFeatureTrackStage } from '../../../src/common/api/planApi';
import { setAuth } from '../../../src/common/auth/auth';
import { makeResponse } from '../../testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const sampleTrack = {
  id: 1,
  featureId: 5,
  kind: 'Backend' as const,
  trackOwnerUserId: 2,
  version: 3,
  stages: [],
};

const sampleTrackWithStage = {
  id: 2,
  featureId: 5,
  kind: 'Frontend' as const,
  trackOwnerUserId: 2,
  version: 1,
  stages: [
    {
      stageKey: 'Development' as const,
      plannedStart: '2026-06-01',
      plannedEnd: '2026-06-30',
      stageOwnerUserId: null,
      stageVersion: 0,
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setAuth({ token: 'test-token', userId: 1, email: 'mgr@example.com', role: 'Manager' });
});

describe('patchFeatureTrack — response shape', () => {
  it('resolves with a FeatureTrack when the server returns the track shape', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleTrack));

    const result = await patchFeatureTrack(5, 'Backend', {});

    expect(result.id).toBe(1);
    expect(result.featureId).toBe(5);
    expect(result.kind).toBe('Backend');
    expect(result.version).toBe(3);
    expect(Array.isArray(result.stages)).toBe(true);
  });

  it('rejects (Zod parse error) when server returns a FeatureSummary envelope instead of a track', async () => {
    const featureSummaryEnvelope = {
      id: 5,
      title: 'A feature',
      description: null,
      state: 'Development',
      tracks: [sampleTrack],
    };
    mockFetch.mockResolvedValueOnce(makeResponse(200, featureSummaryEnvelope));

    await expect(patchFeatureTrack(5, 'Backend', {})).rejects.toThrow();
  });

  it('sends PATCH to the correct track URL', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleTrack));

    await patchFeatureTrack(5, 'Backend', {});

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/\/api\/plan\/features\/5\/tracks\/Backend$/);
  });
});

describe('patchFeatureTrackStage — response shape', () => {
  it('resolves with a FeatureTrack when the server returns the track shape', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleTrackWithStage));

    const result = await patchFeatureTrackStage(5, 'Frontend', 'Development', {
      plannedStart: '2026-06-01',
    });

    expect(result.id).toBe(2);
    expect(result.featureId).toBe(5);
    expect(result.kind).toBe('Frontend');
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].stageKey).toBe('Development');
  });

  it('rejects (Zod parse error) when server returns a FeatureSummary envelope instead of a track', async () => {
    const featureSummaryEnvelope = {
      id: 5,
      title: 'A feature',
      description: null,
      state: 'Development',
      tracks: [sampleTrackWithStage],
    };
    mockFetch.mockResolvedValueOnce(makeResponse(200, featureSummaryEnvelope));

    await expect(
      patchFeatureTrackStage(5, 'Frontend', 'Development', { plannedStart: '2026-06-01' }),
    ).rejects.toThrow();
  });

  it('sends PATCH to the correct stage URL', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleTrackWithStage));

    await patchFeatureTrackStage(5, 'Frontend', 'Development', {});

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/\/api\/plan\/features\/5\/tracks\/Frontend\/stages\/Development$/);
  });
});
