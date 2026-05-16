import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchFeatureTrack, patchFeatureTrackStage } from '../../../src/common/api/planApi';
import { setAuth } from '../../../src/common/auth/auth';
import { makeResponse } from '../../testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setAuth({ token: 'test-token', userId: 1, email: 'mgr@example.com', role: 'Manager' });
});

describe('patchFeatureTrack — response shape', () => {
  it('resolves with undefined when the server returns 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204));

    const result = await patchFeatureTrack(5, 'Backend', {});

    expect(result).toBeUndefined();
  });

  it('sends PATCH to the correct track URL', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204));

    await patchFeatureTrack(5, 'Backend', {});

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/\/api\/plan\/features\/5\/tracks\/Backend$/);
  });
});

describe('patchFeatureTrackStage — response shape', () => {
  it('resolves with undefined when the server returns 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204));

    const result = await patchFeatureTrackStage(5, 'Frontend', 'Development', {
      plannedStart: '2026-06-01',
    });

    expect(result).toBeUndefined();
  });

  it('sends PATCH to the correct stage URL', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204));

    await patchFeatureTrackStage(5, 'Frontend', 'Development', {});

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toMatch(/\/api\/plan\/features\/5\/tracks\/Frontend\/stages\/Development$/);
  });
});
