import { clearAuth, getToken } from '../auth/auth';

const _apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!_apiBaseUrl && import.meta.env.PROD) {
  throw new Error('VITE_API_BASE_URL is not set');
}
export const API_BASE_URL: string = _apiBaseUrl ?? 'http://localhost:5000';

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    const hadToken = !!getToken();
    clearAuth();
    if (hadToken) {
      window.location.href = '/login';
    }
    throw new Error(hadToken ? 'Session expired' : 'Invalid credentials');
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }
  return response.json() as Promise<T>;
}
