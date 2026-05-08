import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AUTH_KEY } from '../../src/common/auth/auth';
import type { UserRole } from '../../src/common/auth/roles';

export { AUTH_KEY };
export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:5000';
// Mirrors the private STORAGE_KEY in src/i18n/config.ts — that module
// triggers i18next.init() at import time so we can't import from it here.
export const LANG_KEY = 'mrhelper_lang';

export interface AuthResponseBody {
  token: string;
  userId: number;
  email: string;
  role: UserRole;
}

export async function apiLogin(
  apiRequest: APIRequestContext,
  creds: { email: string; password: string },
): Promise<AuthResponseBody> {
  const response = await apiRequest.post(`${API_BASE_URL}/api/auth/login`, { data: creds });
  expect(
    response.ok(),
    `login for ${creds.email} expected 2xx, got ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();
  return (await response.json()) as AuthResponseBody;
}

export async function apiRegister(
  apiRequest: APIRequestContext,
  payload: { email: string; password: string },
): Promise<AuthResponseBody> {
  const response = await apiRequest.post(`${API_BASE_URL}/api/auth/register`, { data: payload });
  expect(
    response.ok(),
    `register for ${payload.email} expected 2xx, got ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();
  return (await response.json()) as AuthResponseBody;
}

export async function seedAuthInLocalStorage(page: Page, auth: AuthResponseBody): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: AUTH_KEY, value: JSON.stringify(auth) },
  );
}

export async function setLanguageInLocalStorage(page: Page, lang: 'ru' | 'en'): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: LANG_KEY, value: lang },
  );
}

export function randomEmail(prefix = 'e2e'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now();
  return `${prefix}+${ts}-${rand}@e2e.test`;
}
