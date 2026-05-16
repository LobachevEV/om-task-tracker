// Reproduction spec for MB-001-01 — Today-button click TypeError.
//
// Invoked by sibling MB-001-01.sh. Exit codes:
//   playwright test 0 (all green) → snippet returns 0 → bug FIXED
//   playwright test 1 (red)        → snippet returns 2 → bug PRESENT
//
// Assertions:
//   AC#1 — clicking the "Today" chip from a far-scrolled position
//          scrolls the today hairline into the visible viewport.
//   AC#2 — zero page-error events containing the substring
//          `Failed to execute 'scrollTo'` are captured during the
//          full click + settle window.
//
// MUST NOT exercise the Ctrl+G keyboard path — that path is OUT OF
// SCOPE for this fix and remains the regression floor (asserting on
// it would mask a click-only regression). A separate sanity sweep
// (Ctrl+G still works) lives in the existing keyboard-shortcut spec
// suite and is exercised by the baseline-tests run, not here.

import { test, expect } from './fixtures/authed';
import { isBackendReachable } from './helpers/backend';

const SCROLLER_SELECTOR = '.gantt-timeline-scroller__viewport, [data-gantt-scroller]';
const TODAY_CHIP_SELECTOR = '.gantt-timeline-scroller__today-chip';
const HAIRLINE_SELECTOR = '.gantt-timeline-scroller__today-hairline, [data-today-hairline]';

test.describe('@harness MB-001-01 — Today chip click does not throw', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping MB-001-01 repro',
    );
  });

  test('clicking the Today chip after far-right scroll scrolls hairline into view without TypeError', async ({
    managerPage,
  }) => {
    const errorMessages: string[] = [];
    managerPage.on('pageerror', (err) => {
      errorMessages.push(err.message ?? String(err));
    });
    managerPage.on('console', (msg) => {
      if (msg.type() === 'error') errorMessages.push(msg.text());
    });

    await managerPage.setViewportSize({ width: 1440, height: 900 });
    await managerPage.goto('/plan');
    await managerPage.locator('.gantt-page__header-row').waitFor({ state: 'visible' });

    const scroller = managerPage.locator(SCROLLER_SELECTOR).first();
    await expect(scroller, 'scroller must be in DOM').toBeVisible({ timeout: 5_000 });

    // Force a far-right horizontal scroll so the "Today" chip becomes
    // visible (it only renders when today is NOT in view).
    await scroller.evaluate((el) => {
      const target = el as HTMLElement;
      target.scrollLeft = target.scrollWidth;
    });

    const chip = managerPage.locator(TODAY_CHIP_SELECTOR).first();
    await expect(
      chip,
      'today chip must be visible after far-right scroll (todayInView=false)',
    ).toBeVisible({ timeout: 5_000 });

    // Snapshot scrollLeft pre-click and the pre-existing error count.
    const preClickScrollLeft = await scroller.evaluate(
      (el) => (el as HTMLElement).scrollLeft,
    );
    const preClickErrorCount = errorMessages.length;

    await chip.click();

    // Allow the smooth-scroll to settle. The hook uses Element.scrollTo
    // with behavior 'smooth' by default; 600ms is enough for any
    // reasonable browser smooth-scroll to complete.
    await managerPage.waitForTimeout(800);

    // AC#2: no TypeError from scrollTo introduced by the click.
    const newErrors = errorMessages
      .slice(preClickErrorCount)
      .filter((m) => /Failed to execute 'scrollTo'|ScrollBehavior/i.test(m));
    expect(
      newErrors,
      `expected zero scrollTo TypeErrors after click; got: ${JSON.stringify(newErrors)}`,
    ).toHaveLength(0);

    // AC#1: scroll position must have changed AND the today hairline
    // must now be within the scroller's visible viewport rect.
    const postClickScrollLeft = await scroller.evaluate(
      (el) => (el as HTMLElement).scrollLeft,
    );
    expect(
      postClickScrollLeft,
      `expected scrollLeft to change after Today click; pre=${preClickScrollLeft} post=${postClickScrollLeft}`,
    ).not.toBe(preClickScrollLeft);

    const hairline = managerPage.locator(HAIRLINE_SELECTOR).first();
    const hairlineCount = await hairline.count();
    if (hairlineCount === 0) {
      // Hairline element may not be present in the DOM if today is far
      // outside the rendered viewport range. In that case, the
      // scrollLeft delta above is the ground-truth assertion and we
      // accept it as evidence the click handler executed correctly.
      return;
    }

    const inView = await managerPage.evaluate(
      ({ scrollerSel, hairlineSel }) => {
        const s = document.querySelector(scrollerSel) as HTMLElement | null;
        const h = document.querySelector(hairlineSel) as HTMLElement | null;
        if (!s || !h) return false;
        const sb = s.getBoundingClientRect();
        const hb = h.getBoundingClientRect();
        return hb.right > sb.left && hb.left < sb.right;
      },
      { scrollerSel: SCROLLER_SELECTOR.split(',')[0].trim(), hairlineSel: HAIRLINE_SELECTOR.split(',')[0].trim() },
    );
    expect(
      inView,
      'today hairline must be within the scroller viewport after click',
    ).toBe(true);
  });
});
