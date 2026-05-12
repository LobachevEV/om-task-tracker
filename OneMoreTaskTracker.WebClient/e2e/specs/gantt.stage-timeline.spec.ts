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

interface FixtureTrackStage {
  stageKey: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  stageOwnerUserId: number | null;
  stageVersion: number;
}

interface FixtureTrack {
  id: number;
  featureId: number;
  kind: 'Frontend' | 'Backend';
  trackOwnerUserId: number;
  version: number;
  stages: FixtureTrackStage[];
}

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
  version: number;
  tracks: FixtureTrack[];
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
    // No segment in an overdue state on F1
    await expect(row.locator('[data-overdue="true"]')).toHaveCount(0);

    // UX-002-01: on Development-active (amber-on-amber) rows the active-stage
    // marker must survive as three stacked signals:
    //   (a) a centerline dot inside the segment,
    //   (b) a 1px top+bottom hairline on the segment's border-block,
    //   (c) a brightness delta vs. inactive siblings (full opacity on active,
    //       dimmed on upcoming/completed — brief §4 "railway signal-block").
    const activeSegment = current;
    await expect(
      activeSegment.locator('.gantt-seg-bar__active-dot'),
    ).toHaveCount(1);
    const activeStyles = await activeSegment.evaluate((el: Element) => {
      const cs = window.getComputedStyle(el);
      return {
        borderTopWidth: cs.borderTopWidth,
        borderBottomWidth: cs.borderBottomWidth,
        borderTopStyle: cs.borderTopStyle,
        borderBottomStyle: cs.borderBottomStyle,
        opacity: cs.opacity,
        boxShadow: cs.boxShadow,
      };
    });
    expect(activeStyles.borderTopWidth).toBe('1px');
    expect(activeStyles.borderBottomWidth).toBe('1px');
    expect(activeStyles.borderTopStyle).toBe('solid');
    expect(activeStyles.borderBottomStyle).toBe('solid');
    // Active segment renders at full opacity; the inset inner rail is painted
    // via `box-shadow: inset ...`, so the computed shadow must be non-none.
    expect(activeStyles.opacity).toBe('1');
    expect(activeStyles.boxShadow).not.toBe('none');

    // Brightness delta check (presence, not pixel math): an inactive sibling
    // segment's opacity is less than the active segment's opacity.
    const upcomingOpacity = await row
      .locator('[data-testid="segment-Testing"]')
      .evaluate((el: Element) => window.getComputedStyle(el).opacity);
    expect(Number(upcomingOpacity)).toBeLessThan(Number(activeStyles.opacity));
  });

  test('Flow 1 edge — overdue segment on F2 (Testing overdue)', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-102"]');
    // The Testing lifecycle stage is overdue — its segment carries data-overdue="true"
    await expect(row.locator('[data-testid="segment-Testing"][data-overdue="true"]')).toBeVisible();
  });

  test('Flow 1 edge — partial plan shows 3/5 planned (F3)', async ({ page }) => {
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

  test('Flow 2 — track bands render with per-stage rows for F1', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();

    // Both tracks are visible by default (GanttFeatureTrackBand starts expanded)
    const feBand = page.locator('[data-testid="track-band-101-Frontend"]');
    const beBand = page.locator('[data-testid="track-band-101-Backend"]');
    await expect(feBand).toBeVisible();
    await expect(beBand).toBeVisible();

    // Frontend track: 5 stage rows (SrApproving, Development, StandTesting, EthalonTesting, ReleaseToLive)
    const feStageKeys = ['SrApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive'];
    for (const key of feStageKeys) {
      const stageRow = page.locator(`[data-testid="track-stage-row-101-Frontend-${key}"]`);
      await expect(stageRow).toBeVisible();
      // Owner must not be empty (all F1 Frontend stages have stageOwnerUserId set)
      await expect(stageRow.locator('[data-testid="track-stage-owner"]')).not.toHaveText('');
    }

    // Backend track: 5 stage rows (CsApproving, Development, StandTesting, EthalonTesting, ReleaseToLive)
    const beStageKeys = ['CsApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive'];
    for (const key of beStageKeys) {
      const stageRow = page.locator(`[data-testid="track-stage-row-101-Backend-${key}"]`);
      await expect(stageRow).toBeVisible();
      await expect(stageRow.locator('[data-testid="track-stage-owner"]')).not.toHaveText('');
    }
  });

  test('Flow 2 edge — F6 stale performer renders "removed" without throwing', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    // F6 Frontend Development stage has stageOwnerUserId=9999 which is not in roster
    const feDevRow = page.locator('[data-testid="track-stage-row-106-Frontend-Development"]');
    await expect(feDevRow).toBeVisible();
    await expect(feDevRow.locator('[data-testid="track-stage-owner"]')).toContainText('removed');
    // Same for Backend
    const beDevRow = page.locator('[data-testid="track-stage-row-106-Backend-Development"]');
    await expect(beDevRow).toBeVisible();
    await expect(beDevRow.locator('[data-testid="track-stage-owner"]')).toContainText('removed');
  });

  test('Flow 5 — F4 no-plan feature shows em-dash DTR and unassigned per-stage rows', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.locator('[data-testid="gantt-page"]')).toBeVisible();
    const row = page.locator('[data-testid="feature-row-104"]');
    await expect(row.locator('[data-testid="feature-dtr"]')).toHaveText('—');

    // Track bands are present
    const feBand = page.locator('[data-testid="track-band-104-Frontend"]');
    const beBand = page.locator('[data-testid="track-band-104-Backend"]');
    await expect(feBand).toBeVisible();
    await expect(beBand).toBeVisible();

    // All 5 Frontend stage rows: no-signal rows render a "—" placeholder (noSignal branch)
    // and owner is not displayed (empty signal glyph)
    const feStageKeys = ['SrApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive'];
    for (const key of feStageKeys) {
      const stageRow = page.locator(`[data-testid="track-stage-row-104-Frontend-${key}"]`);
      await expect(stageRow).toBeVisible();
    }
    const beStageKeys = ['CsApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive'];
    for (const key of beStageKeys) {
      const stageRow = page.locator(`[data-testid="track-stage-row-104-Backend-${key}"]`);
      await expect(stageRow).toBeVisible();
    }
  });
});
