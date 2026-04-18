export type UserRole = 'Manager' | 'FrontendDeveloper' | 'BackendDeveloper' | 'Qa';

export interface AuthState {
  token: string;
  userId: number;
  email: string;
  role: UserRole;
}

// TODO: migrate token storage from localStorage to HttpOnly cookies to mitigate XSS exfiltration risk
export const AUTH_KEY = 'mrhelper_auth';

export function getAuth(): AuthState | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function getToken(): string | null {
  return getAuth()?.token ?? null;
}

export function setAuth(state: AuthState): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
