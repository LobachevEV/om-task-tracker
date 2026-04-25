import { test } from '../fixtures/authed';
import type { Page, Route } from '@playwright/test';

interface FeatureStagePlanFixture {
  stage: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  performerUserId: number | null;
  stageVersion: number;
  performer?: unknown;
}

const FEATURE = { id: 101, title: 'Refund workflow', description: null, state: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-06-30', leadUserId: 4, managerUserId: 4, taskCount: 0, taskIds: [], version: 3, stagePlans: [
  { stage: 'CsApproving', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-06-30', performerUserId: 5, stageVersion: 1 },
  { stage: 'Testing', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'EthalonTesting', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
  { stage: 'LiveRelease', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
] };
const ROSTER = [{ userId: 4, email: 'manager@example.com', displayName: 'Manager', role: 'Manager' }, { userId: 5, email: 'a@b.c', displayName: 'Alice FE', role: 'FrontendDeveloper' }];

async function stub(page: Page) {
  await page.route('**/api/plan/features*', async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method === 'PATCH') {
      const body = req.postDataJSON() ?? {};
      console.log('PATCH ' + url.pathname + ' body=' + JSON.stringify(body));
      // Apply the patch to the fixture locally and echo back
      const copy = JSON.parse(JSON.stringify(FEATURE));
      if (url.pathname.endsWith('/title') && body.title) copy.title = body.title;
      if (url.pathname.endsWith('/description')) copy.description = body.description;
      copy.version = copy.version + 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(copy) });
      return;
    }
    const m = /\/api\/plan\/features\/(\d+)(?:[/?]|$)/.exec(url.pathname);
    if (m) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ feature: FEATURE, tasks: [], lead: ROSTER[0], miniTeam: ROSTER, stagePlans: FEATURE.stagePlans.map((sp: FeatureStagePlanFixture) => ({...sp, performer: sp.performerUserId ? ROSTER[1] : null })) }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([FEATURE]) });
  });
  await page.route('**/api/team/members*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROSTER.map(r => ({...r, managerId: r.userId === 4 ? null : 4, isSelf: r.userId === 4, status: { active: 0, lastActive: null, mix: {inDev:0,mrToRelease:0,inTest:0,mrToMaster:0,completed:0}}}))) });
  });
}

test('UX interact — rest vs hover vs focus on title', async ({ managerPage: page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('PE: ' + e.message));
  await stub(page);
  await page.goto('/plan');
  await page.waitForSelector('[data-testid="feature-row-101"]');

  const row = page.locator('[data-testid="feature-row-101"]');
  await page.screenshot({ path: '../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001/01-resting.png', fullPage: true });

  // Find title inline cell
  const titleCell = row.locator('[data-inline-field="title"], [data-testid*="title"]').first();
  if (await titleCell.count()) {
    await titleCell.hover();
    await page.waitForTimeout(150);
    await page.screenshot({ path: '../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001/02-title-hover.png', fullPage: true });

    await titleCell.click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: '../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001/03-title-focus.png', fullPage: true });

    // Try Flow 1: rename via keyboard
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Renamed via inline');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001/04-title-committed.png', fullPage: true });
  } else {
    console.log('NO_TITLE_CELL_FOUND');
    // dump DOM structure of the row
    const html = await row.evaluate((el) => el.outerHTML.substring(0, 4000));
    console.log('ROW_HTML:\n' + html);
  }

  // Expand
  const caret = row.locator('[data-testid="expand-caret"]');
  await caret.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: '../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001/05-expanded.png', fullPage: true });

  // Find a date cell
  const dateCell = page.locator('[data-inline-field^="plannedStart"], [data-testid*="date-cell"], [data-testid*="planned-start"]').first();
  console.log('DATE_CELL_COUNT:', await dateCell.count());
  if (await dateCell.count()) {
    await dateCell.click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: '../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001/06-date-focus.png', fullPage: true });
  }

  // Owner picker
  const ownerCell = page.locator('[data-inline-field^="owner"], [data-testid*="owner"], [data-testid*="performer"]').first();
  console.log('OWNER_CELL_COUNT:', await ownerCell.count());
  if (await ownerCell.count()) {
    await ownerCell.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: '../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001/07-owner-picker.png', fullPage: true });
    await page.keyboard.press('Escape');
  }

  console.log('ERRORS:', errors.length);
  for (const e of errors) console.log('  - ' + e.substring(0, 300));
});
