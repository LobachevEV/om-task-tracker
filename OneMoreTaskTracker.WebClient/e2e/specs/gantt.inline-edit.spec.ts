import { test, expect, type Page, type Route } from '@playwright/test';
import {
  AUTH_KEY,
  LANG_KEY,
} from '../helpers/auth';

// Stub-only spec: exercises the inline-edit primitives via Playwright-mocked
// API routes. No backend required. Covers the 6 required flows from
// func-eval-contract.md §Flows 1–6.

interface StagePlan {
  stage: 'CsApproving' | 'Development' | 'Testing' | 'EthalonTesting' | 'LiveRelease';
  plannedStart: string | null;
  plannedEnd: string | null;
  performerUserId: number | null;
  stageVersion?: number;
}

interface FeatureFixture {
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
  stagePlans: StagePlan[];
  version?: number;
}

interface RosterMember {
  userId: number;
  email: string;
  displayName: string;
  role: 'Manager' | 'FrontendDeveloper' | 'BackendDeveloper' | 'Qa';
  isSelf?: boolean;
}

const FEATURE_TEMPLATE: FeatureFixture = {
  id: 101,
  title: 'Refund workflow',
  description: null,
  state: 'Development',
  plannedStart: '2026-05-10',
  plannedEnd: '2026-06-30',
  leadUserId: 4,
  managerUserId: 4,
  taskCount: 0,
  taskIds: [],
  version: 3,
  stagePlans: [
    { stage: 'CsApproving', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
    { stage: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-06-30', performerUserId: 5, stageVersion: 1 },
    { stage: 'Testing', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
    { stage: 'EthalonTesting', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
    { stage: 'LiveRelease', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  ],
};

const ROSTER: RosterMember[] = [
  { userId: 4, email: 'manager@example.com', displayName: 'Pat Manager', role: 'Manager', isSelf: true },
  { userId: 5, email: 'alice@example.com', displayName: 'Alice FE', role: 'FrontendDeveloper' },
  { userId: 6, email: 'bob@example.com', displayName: 'Bob BE', role: 'BackendDeveloper' },
  { userId: 7, email: 'qa@example.com', displayName: 'Quinn QA', role: 'Qa' },
];

function cloneFeature(base: FeatureFixture): FeatureFixture {
  return JSON.parse(JSON.stringify(base)) as FeatureFixture;
}

function detailEnvelope(feature: FeatureFixture) {
  return {
    feature,
    tasks: [],
    lead: ROSTER[0],
    miniTeam: ROSTER,
    stagePlans: feature.stagePlans.map((sp) => ({
      ...sp,
      performer: sp.performerUserId
        ? ROSTER.find((r) => r.userId === sp.performerUserId) ?? null
        : null,
    })),
  };
}

async function seedAuth(page: Page, role: 'Manager' | 'FrontendDeveloper' = 'Manager') {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    {
      key: AUTH_KEY,
      value: JSON.stringify({
        token: 'stub-token',
        userId: 4,
        email: 'manager@example.com',
        role,
      }),
    },
  );
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: LANG_KEY, value: 'en' },
  );
}

/**
 * Pin `Date` to a fixture-relative day so the Gantt window contains the
 * planned dates we ship in FEATURE_TEMPLATE. Without this the page renders
 * an empty Gantt because feature plans look stale relative to system time.
 */
async function pinToday(page: Page, todayIso: string) {
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

/**
 * Install route stubs for the plan endpoints. The closure owns a mutable
 * `current` feature so PATCH responses can reflect the latest state.
 * `patchBehavior` overrides the default 200-on-any-PATCH for 409 / 422 tests.
 */
function installStubs(
  page: Page,
  options: {
    initial: FeatureFixture;
    patchBehavior?: (route: Route, url: URL, body: Record<string, unknown>) => Promise<boolean>;
  },
) {
  let current = cloneFeature(options.initial);

  const handler = async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();

    // Team roster — gateway exposes this under /api/team/members.
    if (url.pathname.endsWith('/api/team/members') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ROSTER),
      });
      return;
    }

    // Features list
    if (url.pathname.endsWith('/api/plan/features') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([current]),
      });
      return;
    }

    // Feature detail
    if (
      /\/api\/plan\/features\/\d+$/.test(url.pathname) &&
      method === 'GET'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(detailEnvelope(current)),
      });
      return;
    }

    // Per-field PATCH handlers.
    if (method === 'PATCH') {
      const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
      if (options.patchBehavior) {
        const handled = await options.patchBehavior(route, url, body);
        if (handled) return;
      }
      const next = cloneFeature(current);
      if (url.pathname.endsWith('/title') && typeof body.title === 'string') {
        next.title = body.title;
      }
      if (url.pathname.endsWith('/description')) {
        next.description = (body.description as string | null) ?? null;
      }
      const stageMatch = /\/stages\/(\w+)\/(owner|planned-start|planned-end)$/.exec(
        url.pathname,
      );
      if (stageMatch) {
        const stageName = stageMatch[1];
        const field = stageMatch[2];
        const plan = next.stagePlans.find((sp) => sp.stage === stageName);
        if (plan) {
          if (field === 'owner') {
            plan.performerUserId = (body.stageOwnerUserId as number | null) ?? null;
          } else if (field === 'planned-start') {
            plan.plannedStart = (body.plannedStart as string | null) ?? null;
          } else if (field === 'planned-end') {
            plan.plannedEnd = (body.plannedEnd as string | null) ?? null;
          }
          plan.stageVersion = (plan.stageVersion ?? 0) + 1;
        }
      }
      next.version = (next.version ?? 0) + 1;
      current = next;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(current),
      });
      return;
    }

    // Fallback — unknown route; return empty array so the page doesn't error.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  };

  // Match only HTTP API calls. The Vite dev server's `/src/shared/api/*.ts`
  // module loads also include `/api/` in the path, which would be hijacked
  // by a naive `**/api/**` glob; restrict to URLs whose pathname STARTS with
  // `/api/` (and is not a Vite-served source file).
  const apiUrlPattern = /^https?:\/\/[^/]+\/api\/(plan|team|tasks|auth)(\/|$|\?)/;
  return page.route(apiUrlPattern, handler);
}

/** Fixture today — the FEATURE_TEMPLATE dates land within the default 30-day Gantt window. */
const FIXTURE_TODAY = '2026-05-20';

async function waitForPlan(page: Page) {
  await page.goto('/plan');
  await expect(page.getByTestId('gantt-page')).toBeVisible();
  await expect(page.getByTestId('feature-row-101')).toBeVisible();
}

test.describe('gantt inline-edit — manager flows', () => {
  test('Flow 1: manager renames feature title inline', async ({ page }) => {
    await pinToday(page, FIXTURE_TODAY);
    await seedAuth(page);
    await installStubs(page, { initial: FEATURE_TEMPLATE });
    await waitForPlan(page);

    const titleEditor = page.getByTestId('feature-title-editor-101-input');
    await expect(titleEditor).toHaveValue('Refund workflow');
    await titleEditor.click();
    await titleEditor.fill('Refund workflow v2');
    await titleEditor.blur();

    // Row should eventually reflect the renamed title (via re-render from
    // PATCH response → applyFeatureUpdate → usePlanFeatures).
    await expect(page.getByTestId('feature-title-editor-101-input')).toHaveValue(
      'Refund workflow v2',
    );
  });

  test('Flow 2: manager sets a stage owner via inline picker', async ({ page }) => {
    await pinToday(page, FIXTURE_TODAY);
    await seedAuth(page);
    await installStubs(page, { initial: FEATURE_TEMPLATE });
    await waitForPlan(page);

    // Expand the row to reveal sub-rows.
    await page.getByTestId('expand-caret').first().click();

    // Address the input directly by testid. Some sibling row elements
    // (the role badge) overlap the input; programmatic focus avoids
    // hit-testing collisions.
    const input = page.getByTestId('stage-owner-editor-101-Development-input');
    await expect(input).toBeAttached();
    await input.evaluate((el) => {
      (el as HTMLInputElement).focus();
      (el as HTMLInputElement).select();
    });
    // Picker opens on focus. Type to filter the roster to "Bob"; the
    // selected text is replaced as we type.
    await page.keyboard.type('Bob', { delay: 30 });
    // Pick via Enter (highlight defaults to index 0 = first match).
    await page.keyboard.press('Enter');

    // After commit the combobox value reflects the new owner's display name.
    await expect(input).toHaveValue(/Bob BE/);
  });

  test('Flow 3: manager sets a planned-start date', async ({ page }) => {
    await pinToday(page, FIXTURE_TODAY);
    await seedAuth(page);
    await installStubs(page, { initial: FEATURE_TEMPLATE });
    await waitForPlan(page);

    await page.getByTestId('expand-caret').first().click();

    const startEditor = page.getByTestId('stage-planned-start-101-Development-input');
    await startEditor.click();
    await startEditor.fill('2026-05-01');
    await startEditor.blur();

    await expect(startEditor).toHaveValue('2026-05-01');
  });

  test('Flow 4: manager sets a planned-end date', async ({ page }) => {
    await pinToday(page, FIXTURE_TODAY);
    await seedAuth(page);
    await installStubs(page, { initial: FEATURE_TEMPLATE });
    await waitForPlan(page);

    await page.getByTestId('expand-caret').first().click();

    const endEditor = page.getByTestId('stage-planned-end-101-Development-input');
    await endEditor.click();
    await endEditor.fill('2026-07-15');
    await endEditor.blur();

    await expect(endEditor).toHaveValue('2026-07-15');
  });
});

test.describe('gantt inline-edit — viewer regression', () => {
  test('Flow 5: non-manager sees read-only cells (no editors, no chevrons)', async ({ page }) => {
    await pinToday(page, FIXTURE_TODAY);
    await seedAuth(page, 'FrontendDeveloper');
    await installStubs(page, { initial: FEATURE_TEMPLATE });
    await waitForPlan(page);

    // The title should NOT render as an editable input.
    await expect(page.getByTestId('feature-title-editor-101-input')).toHaveCount(0);

    // Expand — stage sub-rows should render read-only (no inline date/owner editors).
    await page.getByTestId('expand-caret').first().click();
    await expect(page.getByTestId('stage-owner-editor-101-Development')).toHaveCount(0);
    await expect(page.getByTestId('stage-planned-start-101-Development-input')).toHaveCount(0);
  });
});

test.describe('gantt inline-edit — 409 conflict', () => {
  test('Flow 6: 409 surfaces inline conflict message', async ({ page }) => {
    await pinToday(page, FIXTURE_TODAY);
    await seedAuth(page);
    await installStubs(page, {
      initial: FEATURE_TEMPLATE,
      patchBehavior: async (route, url) => {
        if (url.pathname.endsWith('/title')) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Updated by someone else — refresh row to see latest.',
              conflict: { kind: 'version', currentVersion: 99 },
            }),
          });
          return true;
        }
        return false;
      },
    });
    await waitForPlan(page);

    const titleEditor = page.getByTestId('feature-title-editor-101-input');
    await titleEditor.click();
    await titleEditor.fill('Renamed while stale');
    await titleEditor.blur();

    // Inline micro-error text should appear below the cell with role="alert".
    await expect(page.getByTestId('inline-cell-error').first()).toBeVisible();
    await expect(page.getByTestId('inline-cell-error').first()).toContainText(/refresh|updated/i);
  });
});
