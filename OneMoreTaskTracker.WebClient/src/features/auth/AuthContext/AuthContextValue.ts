import { createContext } from 'react';
import type { AuthState, UserRole } from '../../../shared/auth/auth';

export interface AuthContextValue {
  user: AuthState | null;
  login: (token: string, userId: number, email: string, role: UserRole) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
