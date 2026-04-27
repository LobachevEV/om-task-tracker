import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuth, getAuth, getToken, setAuth, AUTH_KEY } from '../auth';
import type { AuthState } from '../auth';

const mockState: AuthState = {
  token: 'test-token',
  userId: 42,
  email: 'dev@example.com',
  role: 'FrontendDeveloper',
};

beforeEach(() => {
  localStorage.clear();
});

describe('setAuth / getAuth', () => {
  it('persists and retrieves auth state', () => {
    setAuth(mockState);
    expect(getAuth()).toEqual(mockState);
  });

  it('returns null when nothing is stored', () => {
    expect(getAuth()).toBeNull();
  });

  it('removes corrupted data and returns null', () => {
    localStorage.setItem(AUTH_KEY, 'not-json');
    expect(getAuth()).toBeNull();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });
});

describe('getToken', () => {
  it('returns the token when auth is set', () => {
    setAuth(mockState);
    expect(getToken()).toBe('test-token');
  });

  it('returns null when auth is absent', () => {
    expect(getToken()).toBeNull();
  });
});

describe('clearAuth', () => {
  it('removes the stored auth state', () => {
    setAuth(mockState);
    clearAuth();
    expect(getAuth()).toBeNull();
  });
});
