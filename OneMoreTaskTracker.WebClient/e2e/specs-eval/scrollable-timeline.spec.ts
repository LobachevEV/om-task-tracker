import { test, expect } from '../fixtures/authed';

const SHOTS = '../../gan-harness-feature/gantt-scrollable-timeline/screenshots/iter-001';

test('scrollable-timeline — initial render + sticky landmarks + counts', async ({ managerPage: page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PE: ' + e.message));

  // Track network requests so we can verify chunk-fetch behavior on pan.
  const planRequests: [] = [];
  const boundsRequests: string[] = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/api/plan/features/bounds')) boundsRequests.push(u);
    else if (u.includes('/api/plan/features?') || u.match(/\/api\/plan\/features$/)) planRequests.push(u);
  });

  await page.goto('/plan');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // 1. Region landmark must exist.
  const region = page.getByRole('region', { name: /gantt timeline/i });
  await expect(region).toHaveCount(1, { timeout: 5000 });

  // 2. Initial bounds fetch must have fired.
  console.log('BOUNDS_REQS:', boundsRequests.length, JSON.stringify(boundsRequests.slice(0, 4)));
  console.log('PLAN_REQS:', planRequests.length, JSON.stringify(planRequests.slice(0, 6)));

  // 3. Today indicator: search by class or aria-hidden flag.
  const today = await page.evaluate(() => {
    const cell = document.querySelector('.gantt-date-header__day-cell--today');
    return { hasTodayCell: !!cell, todayText: cell?.textContent?.trim() ?? null };
  });
  console.log('TODAY:', JSON.stringify(today));

  // 4. data-day-cell virtualization markers (DoD lines 91-92).
  const dayCellCount = await page.locator('[data-day-cell]').count();
  const featureRowCount = await page.locator('[data-feature-row]').count();
  console.log('DATA_DAY_CELL:', dayCellCount, 'DATA_FEATURE_ROW:', featureRowCount);

  // 5. Today chip presence (should be absent at rest because today is in viewport).
  const chip = page.locator('.gantt-timeline-scroller__today-chip');
  const chipVisible = await chip.isVisible().catch(() => false);
  console.log('CHIP_AT_REST:', chipVisible);

  // 6. Native scrollbar theming.
  const scrollbarColor = await page.evaluate(() => {
    const el = document.querySelector('.gantt-timeline-scroller');
    if (!el) return null;
    return getComputedStyle(el).getPropertyValue('scrollbar-color');
  });
  console.log('SCROLLBAR_COLOR:', JSON.stringify(scrollbarColor));

  // 7. Viewport scrollLeft initial position (today @ leading 1/3).
  const initialScroll = await page.evaluate(() => {
    const el = document.querySelector('.gantt-timeline-scroller') as HTMLElement | null;
    if (!el) return null;
    return { scrollLeft: el.scrollLeft, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth };
  });
  console.log('INITIAL_SCROLL:', JSON.stringify(initialScroll));

  await page.screenshot({ path: `${SHOTS}/01-initial.png`, fullPage: true });

  // 8. Drive a horizontal pan via the scroller — simulate trackpad-equivalent.
  await page.evaluate(() => {
    const el = document.querySelector('.gantt-timeline-scroller') as HTMLElement | null;
    if (el) el.scrollLeft = el.scrollLeft + 1200;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/02-after-scroll-1200px.png`, fullPage: true });

  const afterPan = await page.evaluate(() => {
    const el = document.querySelector('.gantt-timeline-scroller') as HTMLElement | null;
    return el ? el.scrollLeft : null;
  });
  console.log('SCROLL_AFTER_PAN_PX:', afterPan);
  console.log('PLAN_REQS_AFTER_PAN:', planRequests.length);

  // 9. Today chip should appear once today is offscreen.
  const chipAfter = await chip.isVisible().catch(() => false);
  console.log('CHIP_AFTER_PAN:', chipAfter);

  // 10. Keyboard: Home returns to today. Press on the scroller.
  await page.evaluate(() => {
    const el = document.querySelector('.gantt-timeline-scroller') as HTMLElement | null;
    el?.focus();
  });
  await page.keyboard.press('Home');
  await page.waitForTimeout(600);
  const afterHome = await page.evaluate(() => {
    const el = document.querySelector('.gantt-timeline-scroller') as HTMLElement | null;
    return el ? el.scrollLeft : null;
  });
  console.log('SCROLL_AFTER_HOME_PX:', afterHome);
  await page.screenshot({ path: `${SHOTS}/03-after-home.png`, fullPage: true });

  // 11. End key.
  await page.keyboard.press('End');
  await page.waitForTimeout(600);
  const afterEnd = await page.evaluate(() => {
    const el = document.querySelector('.gantt-timeline-scroller') as HTMLElement | null;
    return el ? el.scrollLeft : null;
  });
  console.log('SCROLL_AFTER_END_PX:', afterEnd);
  await page.screenshot({ path: `${SHOTS}/04-after-end.png`, fullPage: true });

  // 12. Cmd+G go-to-date.
  await page.keyboard.press('Meta+g');
  await page.waitForTimeout(400);
  const goVisible = await page.locator('.gantt-go-to-date, [class*="go-to-date"], input[placeholder*="YYYY"]').count();
  console.log('GOTO_INPUT_COUNT:', goVisible);
  await page.screenshot({ path: `${SHOTS}/05-cmdg.png`, fullPage: true });

  // 13. Hard bound cushion presence.
  const cushion = await page.locator('.gantt-hard-bound-cushion, [class*="hard-bound"]').count();
  console.log('CUSHION_COUNT:', cushion);

  console.log('FINAL_CONSOLE_ERRORS:', errors.length);
  for (const e of errors.slice(0, 20)) console.log('  - ' + e.substring(0, 400));
});
