import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { getAuth, AUTH_KEY } from '../../../shared/auth/auth';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  localStorage.clear();
});

describe('AuthContext', () => {
  it('initial state is null when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('initial state loads from localStorage', () => {
    const authState = { token: 'test-token', userId: 42, email: 'user@example.com', role: 'FrontendDeveloper' as const };
    const storedAuth = {
      token: authState.token,
      userId: authState.userId,
      email: authState.email,
      role: authState.role,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(storedAuth));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(authState);
    expect(result.current.user?.email).toBe('user@example.com');
  });

  it('login updates user and persists to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login('new-token', 99, 'newuser@example.com', 'FrontendDeveloper');
    });

    expect(result.current.user).toEqual({
      token: 'new-token',
      userId: 99,
      email: 'newuser@example.com',
      role: 'FrontendDeveloper',
    });

    const storedAuth = getAuth();
    expect(storedAuth).toEqual({
      token: 'new-token',
      userId: 99,
      email: 'newuser@example.com',
      role: 'FrontendDeveloper',
    });
  });

  it('logout clears user and localStorage', () => {
    const authState = { token: 'test-token', userId: 42, email: 'user@example.com', role: 'FrontendDeveloper' as const };
    const storedAuth = {
      token: authState.token,
      userId: authState.userId,
      email: authState.email,
      role: authState.role,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(storedAuth));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(getAuth()).toBeNull();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');

    errorSpy.mockRestore();
  });
});
