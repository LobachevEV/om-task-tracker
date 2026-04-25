import { test } from '../fixtures/authed';
import type { Route } from '@playwright/test';

// Stub the plan API to return a feature WITH version, so we can probe UX behavior.
test('UX probe — rename, owner, date, description', async ({ managerPage: page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PE: ' + e.message));

  await page.route('**/api/plan/features*', async (route: Route) => {
    const url = new URL(route.request().url());
    const m = /\/api\/plan\/features\/(\d+)(?:[/?]|$)/.exec(url.pathname);
    if (m) {
      const feature = { id: 101, title: 'Refund workflow', description: null, state: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-06-30', leadUserId: 4, managerUserId: 4, taskCount: 0, taskIds: [], version: 3, stagePlans: [
        { stage: 'CsApproving', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
        { stage: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-06-30', performerUserId: 5, stageVersion: 1 },
        { stage: 'Testing', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
        { stage: 'EthalonTesting', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
        { stage: 'LiveRelease', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
      ] };
      const roster = [{ userId: 5, email: 'a@b.c', displayName: 'Alice FE', role: 'FrontendDeveloper' }];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ feature, tasks: [], lead: roster[0], miniTeam: roster, stagePlans: feature.stagePlans.map(sp => ({...sp, performer: sp.performerUserId ? roster[0] : null })) }) });
      return;
    }
    // list
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 101, title: 'Refund workflow', description: null, state: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-06-30', leadUserId: 4, managerUserId: 4, taskCount: 0, taskIds: [], version: 3, stagePlans: [
        { stage: 'CsApproving', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
        { stage: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-06-30', performerUserId: 5, stageVersion: 1 },
        { stage: 'Testing', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
        { stage: 'EthalonTesting', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
        { stage: 'LiveRelease', plannedStart: null, plannedEnd: null, performerUserId: null, stageVersion: 0 },
      ] }]) });
  });
  await page.route('**/api/team/members*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ userId: 4, email: 'manager@example.com', displayName: 'Manager', role: 'Manager', managerId: null, isSelf: true, status: { active: 0, lastActive: null, mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 }}}, { userId: 5, email: 'a@b.c', displayName: 'Alice FE', role: 'FrontendDeveloper', managerId: 4, isSelf: false, status: { active: 0, lastActive: null, mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 }}}]) });
  });

  await page.goto('/plan');
  await page.waitForTimeout(1500);
  const rows = await page.locator('[data-testid^="feature-row-"]').count();
  console.log('FEATURE_ROWS:', rows);
  console.log('CONSOLE_ERRORS:', errors.length);
  for (const e of errors) console.log('  - ' + e.substring(0, 400));

  // Take screenshot for UX eval
  await page.screenshot({ path: '../../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001-resting.png', fullPage: true });

  // Probe the title cell hover/focus
  const titleCell = page.locator('[data-testid="feature-row-101"] [data-testid^="inline-cell-title"], [data-testid="feature-row-101"] [data-testid*="title"]').first();
  const titleCellCount = await titleCell.count();
  console.log('TITLE_CELL_COUNT:', titleCellCount);

  // Test Flow 1 — click title to edit
  const titleText = await page.locator('[data-testid="feature-row-101"]').innerText();
  console.log('ROW_TEXT:\n' + titleText.substring(0, 500));

  // Click expand caret
  const caret = page.locator('[data-testid="feature-row-101"] [data-testid="expand-caret"]');
  if (await caret.count()) {
    await caret.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: '../../gan-harness-feature/gantt-inline-edit-feature/screenshots/iter-001-expanded.png', fullPage: true });
  }
});
