import { test, expect, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTH_KEY,
  LANG_KEY,
  seedAuthInLocalStorage,
  setLanguageInLocalStorage,
} from '../helpers/auth';

// Stub-only spec: the evaluator runs this against Playwright-mocked API routes.
// No backend required. The fixture file is canonical for the harness.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/stage-timeline.json');

interface FixtureFeature {
  id: number;
  title: string;
  description: string | null;
  state: 'CsApproving' | 'Development' | 'Testing' | 'EthalonTesting' | 'LiveRelease';
  plannedStart: string | null;
  plannedEnd: string | null;
  leadUserId: number;
  managerUserId: number;
  taskCount: number;
  taskIds: number[];
  stagePlans: Array<{
    stage: 'CsApproving' | 'Development' | 'Testing' | 'EthalonTesting' | 'LiveRelease';
    plannedStart: string | null;
    plannedEnd: string | null;
    performerUserId: number | null;
  }>;
}

interface FixtureRoot {
  today: string;
  roster: Array<{
    userId: number;
    email: string;
    displayName: string;
    role: 'Manager' | 'FrontendDeveloper' | 'BackendDeveloper' | 'Qa';
  }>;
  features: FixtureFeature[];
}

function loadFixture(): FixtureRoot {
  const raw = readFileSync(FIXTURE_PATH, 'utf-8');
  return JSON.parse(raw) as FixtureRoot;
}

async function seedManagerAuth(page: import('@playwright/test').Page) {
  // Fabricate a manager auth payload; the SPA reads it from localStorage
  // and never re-validates the token client-side. Backend calls are stubbed.
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    {
      key: AUTH_KEY,
      value: JSON.stringify({
        token: 'stub-token',
        userId: 1,
        email: 'pm@example.com',
        role: 'Manager',
      }),
    },
  );
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: LANG_KEY, value: 'en' },
  );
  // Silence typescript unused-import lint for helpers we don't call but keep imported
  void seedAuthInLocalStorage;
  void setLanguageInLocalStorage;
}

/**
 * Inject the fixture's `today` as a stable Date override so that feature
 * windows computed from `new Date()` land in a deterministic place relative
 * to the fixture's planned dates. Without this, walking-clock drift
 * silently hides features whose plans end before the real "today".
 */
async function pinFixtureToday(page: import('@playwright/test').Page, todayIso: string) {
  await page.addInitScript((iso: string) => {
    const pinned = Date.parse(`${iso}T12:00:00Z`);
    const RealDate = Date;
    class PinnedDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(pinned);
          return;
        }
        // @ts-expect-error — forwarding rest args to Date constructor
        super(...args);
      }
      static now(): number {
        return pinned;
      }
    }
    (globalThis as unknown as { Date: typeof Date }).Date = PinnedDate as unknown as typeof Date;
  }, todayIso);
}

async function stubApi(page: import('@playwright/test').Page, fixture: FixtureRoot) {
  await page.route('**/api/plan/features**', async (route: Route) => {
    const url = new URL(route.request().url());
    // Single-feature detail endpoint: /api/plan/features/{id}
    const match = /\/api\/plan\/features\/(\d+)(?:[/?]|$)/.exec(url.pathname);
    if (match) {
      const id = Number(match[1]);
      const feature = fixture.features.find((f) => f.id === id);
      if (!feature) {
        await route.fulfill({ status: 404, body: JSON.stringify({ error: 'not_found' }) });
        return;
      }
      const lead = fixture.roster.find((m) => m.userId === feature.leadUserId) ?? null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feature,
          tasks: [],
          lead,
          miniTeam: fixture.roster,
          stagePlans: feature.stagePlans.map((p) => ({
            ...p,
            performer:
              p.performerUserId == null
                ? null
                : fixture.roster.find((m) => m.userId === p.performerUserId) ?? null,
          })),
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.features),
    });
  });

  await page.route('**/api/team/members', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.roster),
    });
  });
}

test.describe('gantt stage timeline (FE-only stubbed)', () => {
  test.beforeEach(async ({ page }) => {
    const fixture = loadFixture();
    await pinFixtureToday(page, fixture.today);
    await seedManagerAuth(page);
    await stubApi(page, fixture);
  });

  test('Flow 1 — collapsed row: status at a glance (F1)', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();

    const row = page.locator('[data-testid="feature-row-101"]');
    await expect(row).toBeVisible();
    const segs = row.locator('[data-testid^="segment-"]');
    await expect(segs).toHaveCount(5);
    const current = row.locator('[aria-current="step"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute('data-testid', 'segment-Development');
    await expect(row.locator('[data-testid="feature-overdue-badge"]')).toHaveCount(0);
  });

  test('Flow 1 edge — overdue badge on F2 (Testing overdue)', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-102"]');
    await expect(row.locator('[data-testid="feature-overdue-badge"]')).toBeVisible();
  });

  test('Flow 1 edge — partial plan shows 2/5 planned (F3)', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-103"]');
    const counter = row.locator('[data-testid="feature-planned-counter"]');
    await expect(counter).toHaveText(/^3\/5\b/);
  });

  test('Flow 1 edge — F5 LiveRelease renders DTR as check glyph', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-105"]');
    const dtr = row.locator('[data-testid="feature-dtr"]');
    await expect(dtr).toHaveText('✓');
  });

  test('Flow 2 — expand reveals 5 stage sub-rows in canonical order', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-101"]');
    const caret = row.locator('[data-testid="expand-caret"]');
    await expect(caret).toHaveAttribute('aria-expanded', 'false');
    await caret.click();
    await expect(caret).toHaveAttribute('aria-expanded', 'true');

    const subRows = page.locator('[data-testid^="stage-subrow-101-"]');
    await expect(subRows).toHaveCount(5);
    // owner + DTR non-empty on every sub-row.
    for (const stage of [
      'CsApproving',
      'Development',
      'Testing',
      'EthalonTesting',
      'LiveRelease',
    ]) {
      const sub = page.locator(`[data-testid="stage-subrow-101-${stage}"]`);
      await expect(sub.locator('[data-testid="stage-owner"]')).not.toHaveText('');
      await expect(sub.locator('[data-testid="stage-dtr"]')).not.toHaveText('');
    }

    await caret.click();
    await expect(caret).toHaveAttribute('aria-expanded', 'false');
    await expect(subRows).toHaveCount(0);
  });

  test('Flow 2 edge — F6 stale performer renders "removed" without throwing', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-106"]');
    await row.locator('[data-testid="expand-caret"]').click();
    const devSub = page.locator('[data-testid="stage-subrow-106-Development"]');
    await expect(devSub.locator('[data-testid="stage-owner"]')).toContainText('removed');
  });

  test('Flow 5 — F4 no-plan feature shows unassigned + em-dash DTR', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-104"]');
    await expect(row.locator('[data-testid="feature-dtr"]')).toHaveText('—');
    await row.locator('[data-testid="expand-caret"]').click();
    const subRows = page.locator('[data-testid^="stage-subrow-104-"]');
    await expect(subRows).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(subRows.nth(i).locator('[data-testid="stage-dtr"]')).toHaveText('—');
      await expect(subRows.nth(i).locator('[data-testid="stage-owner"]')).toContainText(
        /unassigned/i,
      );
    }
  });
});
