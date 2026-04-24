import { clearAuth, getToken } from '../auth/auth';

const _apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!_apiBaseUrl && import.meta.env.PROD) {
  throw new Error('VITE_API_BASE_URL is not set');
}
// In dev, default to '' so requests go through the Vite proxy (see vite.config.ts).
// Same-origin avoids CORS preflight failures and IPv4/IPv6 resolution mismatches
// that surface to the user as a cryptic "Failed to fetch" error.
export const API_BASE_URL: string = _apiBaseUrl ?? '';

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
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
