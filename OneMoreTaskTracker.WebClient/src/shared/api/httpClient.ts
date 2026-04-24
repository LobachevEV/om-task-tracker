import { clearAuth, getToken } from '../auth/auth';
import { ApiError, type InlineEditConflict } from './ApiError';

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

function parseConflict(raw: unknown): InlineEditConflict | null {
  if (raw == null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const kind = obj.kind;
  if (kind !== 'version' && kind !== 'overlap' && kind !== 'order' && kind !== 'rangeInvalid') {
    return null;
  }
  return {
    kind,
    with: typeof obj.with === 'string' ? obj.with : undefined,
    currentVersion: typeof obj.currentVersion === 'number' ? obj.currentVersion : undefined,
  };
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    const hadToken = !!getToken();
    clearAuth();
    if (hadToken) {
      window.location.href = '/login';
    }
    throw new ApiError(401, hadToken ? 'Session expired' : 'Invalid credentials');
  }
  if (!response.ok) {
    // Try to parse the structured gateway envelope so inline editors can
    // react to `conflict.kind` without re-parsing a text body.
    const contentType = response.headers.get('content-type') ?? '';
    let detail = response.statusText;
    let conflict: InlineEditConflict | null = null;
    if (contentType.includes('application/json')) {
      try {
        const body = (await response.json()) as unknown;
        if (body && typeof body === 'object') {
          const obj = body as Record<string, unknown>;
          if (typeof obj.error === 'string' && obj.error.length > 0) {
            detail = obj.error;
          }
          conflict = parseConflict(obj.conflict);
        }
      } catch {
        // Fall through to text parsing.
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text) detail = text;
    }
    const message = `Request failed (${response.status}): ${detail}`;
    throw new ApiError(response.status, message, conflict);
  }
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
