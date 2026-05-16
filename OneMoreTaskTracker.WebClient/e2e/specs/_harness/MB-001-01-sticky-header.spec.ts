import { test, expect } from '../../fixtures/authed';
import { isBackendReachable } from '../../helpers/backend';

const VIEWPORTS = [1440, 1280] as const;
const PANE_SELECTOR = '.gantt-page__timeline-wrap';
const HEADER_SELECTOR = '.gantt-page__header-row';
const HAIRLINE_SELECTOR = '.gantt-page__today-hairline';
const SCROLL_TARGET_PX = 800;
const MAX_HEADER_TOP_OFFSET_PX = 10;
const HAIRLINE_DELTA_TOLERANCE_PX = 0.5;

/**
 * Resolves the element that actually owns vertical overflow inside the
 * timeline pane. After the fix this MAY be the original
 * `.gantt-page__timeline-wrap` (status-quo topology) OR the inner
 * `.gantt-timeline-scroller__viewport` (opt-1 single-container
 * topology). The header MUST stay pinned to the pane top regardless
 * of which container owns the vertical scroll, so we resolve the
 * actual scroller dynamically.
 */
async function getVerticalScrollerHandle(page: import('@playwright/test').Page) {
  return page.evaluateHandle(() => {
    const wrap = document.querySelector('.gantt-page__timeline-wrap');
    if (!wrap) return null;
    const viewport = wrap.querySelector('.gantt-timeline-scroller__viewport');
    const candidates = [viewport, wrap].filter(Boolean) as HTMLElement[];
    for (const el of candidates) {
      const style = window.getComputedStyle(el);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        return el;
      }
    }
    // Fall back to wrap if neither qualifies; caller will fail loudly.
    return wrap as HTMLElement;
  });
}

test.describe('@harness MB-001-01 — timeline header row stays sticky on vertical scroll', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping MB-001-01 sticky-header spec',
    );
  });

  for (const vw of VIEWPORTS) {
    test(`header pinned at pane top before AND after scrollTop=${SCROLL_TARGET_PX} at ${vw}x900`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator(HEADER_SELECTOR).waitFor({ state: 'visible' });

      const pane = managerPage.locator(PANE_SELECTOR);
      const header = managerPage.locator(HEADER_SELECTOR);

      const paneBoxInitial = await pane.boundingBox();
      const headerBoxInitial = await header.boundingBox();
      expect(paneBoxInitial, 'pane laid out on initial load').not.toBeNull();
      expect(headerBoxInitial, 'header laid out on initial load').not.toBeNull();

      const initialTopOffset = headerBoxInitial!.y - paneBoxInitial!.y;
      expect(
        initialTopOffset,
        `[AC#1 initial] header.y(${headerBoxInitial!.y}) - pane.y(${paneBoxInitial!.y}) = ${initialTopOffset} px must be in [0, ${MAX_HEADER_TOP_OFFSET_PX}] at ${vw}px`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        initialTopOffset,
        `[AC#1 initial] header offset ${initialTopOffset}px exceeds ${MAX_HEADER_TOP_OFFSET_PX}px at ${vw}px`,
      ).toBeLessThanOrEqual(MAX_HEADER_TOP_OFFSET_PX);

      // Capture today-hairline baseline x BEFORE scroll (AC#3 proxy).
      const hairlineBoxBefore = await managerPage.locator(HAIRLINE_SELECTOR).boundingBox();
      // Hairline may be off-screen at this viewport — that's fine; only
      // assert delta if both before+after measurements exist.

      // Drive vertical scroll on whichever element actually owns it.
      const scroller = await getVerticalScrollerHandle(managerPage);
      const scrolled = await managerPage.evaluate(
        ({ el, top }) => {
          if (!el) return { ok: false, scrollTop: 0 };
          el.scrollTop = top;
          return { ok: true, scrollTop: el.scrollTop };
        },
        { el: scroller, top: SCROLL_TARGET_PX },
      );
      expect(scrolled.ok, 'must find a vertical scroll container').toBe(true);
      expect(
        scrolled.scrollTop,
        `scrollTop after assignment is ${scrolled.scrollTop}, expected ≥ ${SCROLL_TARGET_PX - 1}`,
      ).toBeGreaterThanOrEqual(SCROLL_TARGET_PX - 1);

      // Re-measure header AFTER scroll.
      const paneBoxAfter = await pane.boundingBox();
      const headerBoxAfter = await header.boundingBox();
      expect(headerBoxAfter, 'header still laid out after vscroll').not.toBeNull();

      const afterTopOffset = headerBoxAfter!.y - paneBoxAfter!.y;
      expect(
        afterTopOffset,
        `[AC#1 post-scroll] header.y(${headerBoxAfter!.y}) - pane.y(${paneBoxAfter!.y}) = ${afterTopOffset} px must be in [0, ${MAX_HEADER_TOP_OFFSET_PX}] at ${vw}px after scrollTop=${SCROLL_TARGET_PX}`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        afterTopOffset,
        `[AC#1 post-scroll] header offset ${afterTopOffset}px exceeds ${MAX_HEADER_TOP_OFFSET_PX}px at ${vw}px after scrollTop=${SCROLL_TARGET_PX} — header lost stickiness`,
      ).toBeLessThanOrEqual(MAX_HEADER_TOP_OFFSET_PX);

      // AC#3 today-hairline x-coord stability.
      if (hairlineBoxBefore !== null) {
        const hairlineBoxAfter = await managerPage.locator(HAIRLINE_SELECTOR).boundingBox();
        if (hairlineBoxAfter !== null) {
          const dx = Math.abs(hairlineBoxAfter.x - hairlineBoxBefore.x);
          expect(
            dx,
            `[AC#3] today-hairline x shifted ${dx}px (>${HAIRLINE_DELTA_TOLERANCE_PX}px) at ${vw}px — date column alignment lost`,
          ).toBeLessThanOrEqual(HAIRLINE_DELTA_TOLERANCE_PX);
        }
      }
    });
  }
});
