import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login, register } from '../../../src/common/api/authApi';
import type { LoginPayload, RegisterPayload } from '../../../src/common/types/auth';
import { makeResponse } from '../../testUtils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends POST to /api/auth/login with payload', async () => {
    const payload: LoginPayload = { email: 'user@example.com', password: 'password123' };
    const responseData = { token: 'jwt.token', userId: 1, email: 'user@example.com', role: 'FrontendDeveloper' as const };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await login(payload);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
  });

  it('returns parsed AuthResponse on success', async () => {
    const payload: LoginPayload = { email: 'user@example.com', password: 'password123' };
    const responseData = { token: 'jwt.token', userId: 42, email: 'user@example.com', role: 'FrontendDeveloper' as const };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await login(payload);

    expect(result).toEqual(responseData);
    expect(result.token).toBe('jwt.token');
    expect(result.userId).toBe(42);
  });

  it('throws on 500 error', async () => {
    const payload: LoginPayload = { email: 'user@example.com', password: 'password123' };
    mockFetch.mockResolvedValueOnce(makeResponse(500, { error: 'Server error' }));

    await expect(login(payload)).rejects.toThrow(/Request failed \(500\)/);
  });

  it('throws on invalid auth response schema', async () => {
    const payload: LoginPayload = { email: 'user@example.com', password: 'password123' };
    mockFetch.mockResolvedValueOnce(makeResponse(200, { token: 'jwt.token' })); // missing userId, email, role

    await expect(login(payload)).rejects.toThrow();
  });
});

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends POST to /api/auth/register', async () => {
    const payload: RegisterPayload = { email: 'newuser@example.com', password: 'password123' };
    const responseData = { token: 'jwt.token', userId: 2, email: 'newuser@example.com', role: 'Manager' as const };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await register(payload);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
  });

  it('returns parsed AuthResponse on success', async () => {
    const payload: RegisterPayload = { email: 'newuser@example.com', password: 'password123' };
    const responseData = { token: 'jwt.token', userId: 2, email: 'newuser@example.com', role: 'Manager' as const };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    const result = await register(payload);

    expect(result).toEqual(responseData);
    expect(result.email).toBe('newuser@example.com');
  });

  it('only includes email and password fields', async () => {
    const payload: RegisterPayload = { email: 'user@example.com', password: 'password123' };
    const responseData = { token: 'jwt.token', userId: 3, email: 'user@example.com', role: 'Manager' as const };
    mockFetch.mockResolvedValueOnce(makeResponse(200, responseData));

    await register(payload);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(payload),
      }),
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toEqual({ email: 'user@example.com', password: 'password123' });
    expect(callBody.managerId).toBeUndefined();
  });
});
