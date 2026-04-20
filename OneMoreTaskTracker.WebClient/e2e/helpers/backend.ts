import { request } from '@playwright/test';
import { API_BASE_URL } from './auth';

/**
 * Probe the gateway's /api/auth/login endpoint; return true if any HTTP
 * response arrives (even 400/401). Used to skip integration specs when the
 * backend stack isn't running instead of producing misleading failures.
 */
export async function isBackendReachable(): Promise<boolean> {
  try {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: 'ping@e2e.test', password: 'x' },
      timeout: 3_000,
    });
    await ctx.dispose();
    return res.status() > 0;
  } catch {
    return false;
  }
}
