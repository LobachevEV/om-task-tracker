// Reproduction spec for MB-001-01 — Status-filter popover occlusion at narrow viewport.
//
// When copied to e2e/MB-001-01.repro.spec.ts by the sibling shell driver,
// it resolves fixtures/helpers at the same depth as the existing
// e2e/MB-001-01.repro.spec.ts pattern used by the Today-chip fix run.
//
// Exit codes (per check-issue-closed.mjs contract, mediated by MB-001-01.sh):
//   playwright test 0 (all green) → snippet returns 0 → bug FIXED
//   playwright test 1 (red)        → snippet returns 2 → bug PRESENT
//
// Assertions:
//   AC#1 — at viewport 1024×768, opening the Status filter popover shows
//          ALL chips (the "all" chip + every FEATURE_STATE_ENTRIES chip)
//          and each chip's centre is its own element (or contains/is
//          contained by it) per document.elementFromPoint.
//   AC#2 — same assertion at viewport 1280×800 and 1440×900 (no
//          regression at wider widths).
//   AC#3 — `.gantt-toolbar` and `.gantt-page__header-row` are both still
//          `position: sticky` (B1 sticky-axis not regressed).

import { test, expect } from '../../fixtures/authed';
import { isBackendReachable } from '../../helpers/backend';

const VIEWPORTS = [
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;

test.describe('@harness MB-001-01 — Status filter popover not occluded by sticky timeline header', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping MB-001-01 repro',
    );
  });

  for (const vp of VIEWPORTS) {
    test(`every status chip is clickable at ${vp.width}×${vp.height}`, async ({
      managerPage,
    }) => {
      await managerPage.setViewportSize(vp);
      await managerPage.goto('/plan');
      await managerPage
        .locator('.gantt-page__header-row')
        .waitFor({ state: 'visible', timeout: 10_000 });

      const trigger = managerPage
        .locator('[data-testid="gantt-state-filter-trigger"]')
        .first();
      await expect(trigger, 'state filter trigger must exist').toBeVisible();
      await trigger.click();

      const popover = managerPage
        .locator('[data-testid="gantt-state-filter-popover"]')
        .first();
      await expect(popover, 'popover must mount on trigger click').toBeVisible({
        timeout: 2_000,
      });

      // B1 sticky-axis regression guard.
      const stickyChecks = await managerPage.evaluate(() => {
        const toolbar = document.querySelector('.gantt-toolbar') as HTMLElement | null;
        const header = document.querySelector('.gantt-page__header-row') as HTMLElement | null;
        return {
          toolbarPosition: toolbar ? window.getComputedStyle(toolbar).position : null,
          headerPosition: header ? window.getComputedStyle(header).position : null,
        };
      });
      expect(
        stickyChecks.toolbarPosition,
        'toolbar must remain position:sticky',
      ).toBe('sticky');
      expect(
        stickyChecks.headerPosition,
        'header row must remain position:sticky (B1 invariant)',
      ).toBe('sticky');

      const occlusion = await managerPage.evaluate(() => {
        const chipNodes = Array.from(
          document.querySelectorAll('[data-testid^="gantt-state-chip-"]'),
        ) as HTMLElement[];
        return chipNodes.map((chip) => {
          const r = chip.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const topEl = document.elementFromPoint(cx, cy) as HTMLElement | null;
          const isSelfOrChild =
            topEl !== null &&
            (topEl === chip || chip.contains(topEl) || topEl.contains(chip));
          return {
            testid: chip.getAttribute('data-testid'),
            inViewport: cy >= 0 && cy <= window.innerHeight,
            topElTag: topEl?.tagName ?? null,
            topElClass: topEl?.className ?? null,
            clickable: isSelfOrChild,
          };
        });
      });

      expect(
        occlusion.length,
        'popover must render at least the "all" chip + 5 state chips',
      ).toBeGreaterThanOrEqual(6);

      const occluded = occlusion.filter((c) => c.inViewport && !c.clickable);
      expect(
        occluded,
        `expected zero occluded chips at ${vp.width}×${vp.height}; got: ${JSON.stringify(occluded)}`,
      ).toHaveLength(0);
    });
  }
});
