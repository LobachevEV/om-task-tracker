import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeaders, handleResponse } from '../httpClient';
import { getToken, setAuth, clearAuth } from '../../auth/auth';
import { makeResponse } from '../../../test/testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('authHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns Bearer token when auth is set', () => {
    setAuth({ token: 'test-token-123', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const headers = authHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer test-token-123' });
  });

  it('returns empty object when no auth', () => {
    clearAuth();
    const headers = authHeaders();
    expect(headers).toEqual({});
  });
});

describe('handleResponse', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    const body = { data: 'test' };
    const response = makeResponse(200, body);
    const result = await handleResponse<typeof body>(response);
    expect(result).toEqual(body);
  });

  it('throws with status info on non-401 error', async () => {
    const body = { error: 'Not found' };
    const response = makeResponse(404, body);
    await expect(handleResponse(response)).rejects.toThrow(/Request failed \(404\)/);
  });

  it('throws "Invalid credentials" on 401 when no token', async () => {
    clearAuth();
    const response = makeResponse(401, {});
    await expect(handleResponse(response)).rejects.toThrow('Invalid credentials');
  });

  it('clears auth on 401 with token', async () => {
    setAuth({ token: 'test-token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' });
    const response = makeResponse(401, {});
    await expect(handleResponse(response)).rejects.toThrow('Session expired');
    expect(getToken()).toBeNull();
  });

  it('uses response.statusText when response.text() fails', async () => {
    const response = makeResponse(500, {});
    vi.spyOn(response, 'text').mockRejectedValueOnce(new Error('read error'));
    await expect(handleResponse(response)).rejects.toThrow(/Request failed \(500\)/);
  });
});
