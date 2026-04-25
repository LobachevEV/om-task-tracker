import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, UserRole } from '../../../shared/auth/auth';
import { clearAuth, getAuth, setAuth } from '../../../shared/auth/auth';
import { AuthContext } from './AuthContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(getAuth);

  const login = useCallback((token: string, userId: number, email: string, role: UserRole) => {
    const state: AuthState = { token, userId, email, role };
    setAuth(state);
    setUser(state);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
