/* eslint-disable react-hooks/rules-of-hooks */
// Playwright fixtures receive a callback named `use` (the framework's
// "provide-fixture" primitive, not the React hook).
import { test as base, type APIRequestContext, type Page } from '@playwright/test';
import {
  apiLogin,
  apiRegister,
  API_BASE_URL,
  seedAuthInLocalStorage,
  setLanguageInLocalStorage,
  type AuthResponseBody,
} from '../helpers/auth';
import { DEV_DEVELOPERS, DEV_SEED_PASSWORD } from './devSeed';

export interface SeededAccount {
  email: string;
  password: string;
  userId: number;
  jwt: string;
}

export interface PlanSeed {
  manager: SeededAccount;
  developer: SeededAccount;
  jiraTaskId: string;
  placeholderFeatureId: number;
}

export interface PlanFixtures {
  seeded: PlanSeed;
  planPage: Page;
  developerPage: Page;
}

function uniqueEmail(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}+${ts}-${rand}@example.com`;
}

const SEED_PASSWORD = 'Password123!';

async function createPlaceholderFeature(
  apiRequest: APIRequestContext,
  jwt: string,
  title: string,
): Promise<number> {
  const res = await apiRequest.post(`${API_BASE_URL}/api/plan/features`, {
    headers: { Authorization: `Bearer ${jwt}` },
    // Payload shape mirrors OneMoreTaskTracker.Api.Controllers.CreateFeaturePayload.
    // managerUserId is derived from the JWT server-side; we only supply title.
    data: { title },
  });
  if (!res.ok()) {
    throw new Error(`create feature failed: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { id: number };
  return body.id;
}

async function createTaskAttachedToFeature(
  apiRequest: APIRequestContext,
  developerJwt: string,
  jiraId: string,
  featureId: number,
): Promise<void> {
  const res = await apiRequest.post(`${API_BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${developerJwt}` },
    // CreateTaskPayload: { JiraId, FeatureId, StartDate? }
    data: { jiraId, featureId },
  });
  if (!res.ok()) {
    throw new Error(`create task failed: ${res.status()} ${await res.text()}`);
  }
}

/**
 * Extended fixture for Plan happy-path specs.
 *
 * Known gaps (documented in the generator report):
 * - `/api/auth/register` with `ManagerId = 0` always creates a Manager
 *   (see OneMoreTaskTracker.Users/UserServiceHandler.cs:34). There is no
 *   REST endpoint that registers a non-manager, so the `developer` account
 *   falls back to a dev-seeded developer (`alice.frontend@example.com`).
 *   The fixture therefore requires `ASPNETCORE_ENVIRONMENT=Development`
 *   on the Users service. When the backend is unreachable the specs skip
 *   via `isBackendReachable()`, so this gap is silent on CI without a stack.
 */
export const planTest = base.extend<PlanFixtures>({
  seeded: async ({ request }, use) => {
    const managerEmail = uniqueEmail('manager');
    const managerAuth: AuthResponseBody = await apiRegister(request, {
      email: managerEmail,
      password: SEED_PASSWORD,
    });

    // Developer falls back to the dev seed — /api/auth/register always yields
    // a Manager. The first frontend developer is deterministic.
    const seededDev = DEV_DEVELOPERS[0];
    const developerAuth: AuthResponseBody = await apiLogin(request, {
      email: seededDev.email,
      password: DEV_SEED_PASSWORD,
    });

    const placeholderFeatureId = await createPlaceholderFeature(
      request,
      managerAuth.token,
      'Setup',
    );

    const jiraTaskId = `E2E-PLAN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    await createTaskAttachedToFeature(
      request,
      developerAuth.token,
      jiraTaskId,
      placeholderFeatureId,
    );

    const seed: PlanSeed = {
      manager: {
        email: managerAuth.email,
        password: SEED_PASSWORD,
        userId: managerAuth.userId,
        jwt: managerAuth.token,
      },
      developer: {
        email: developerAuth.email,
        password: DEV_SEED_PASSWORD,
        userId: developerAuth.userId,
        jwt: developerAuth.token,
      },
      jiraTaskId,
      placeholderFeatureId,
    };

    await use(seed);
    // No tear-down: the DB is ephemeral per run (documented in e2e/README.md).
    // Unique-per-run emails + jiraIds keep reruns idempotent.
  },

  planPage: async ({ page, seeded }, use) => {
    await setLanguageInLocalStorage(page, 'en');
    await seedAuthInLocalStorage(page, {
      token: seeded.manager.jwt,
      userId: seeded.manager.userId,
      email: seeded.manager.email,
      role: 'Manager',
    });
    await use(page);
  },

  developerPage: async ({ browser, seeded }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageInLocalStorage(page, 'en');
    await seedAuthInLocalStorage(page, {
      token: seeded.developer.jwt,
      userId: seeded.developer.userId,
      email: seeded.developer.email,
      role: 'FrontendDeveloper',
    });
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
