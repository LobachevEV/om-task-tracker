import { test, expect } from '../../fixtures/authed';
import { isBackendReachable } from '../../helpers/backend';

const VIEWPORTS = [1024, 1100, 1280, 1440, 1600] as const;

test.describe('@harness row-grid-cascade — Gutter CSS cascade at each breakpoint', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping row-grid-cascade harness spec',
    );
  });

  // ----- 1. All three gutter classes resolve to the same rendered width -----
  for (const vw of VIEWPORTS) {
    test(`gutter widths are identical at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
      await managerPage.locator('.gantt-gutter').first().waitFor({ state: 'visible' });

      const widths = await managerPage.evaluate(() => {
        const feature = document.querySelector<HTMLElement>('.gantt-row__gutter');
        const band = document.querySelector<HTMLElement>('.gantt-track-band__gutter');
        const stage = document.querySelector<HTMLElement>('.gantt-track-stage-row__gutter');
        return {
          feature: feature?.getBoundingClientRect().width ?? -1,
          band: band?.getBoundingClientRect().width ?? -1,
          stage: stage?.getBoundingClientRect().width ?? -1,
        };
      });

      expect(widths.feature, 'feature gutter must be positive').toBeGreaterThan(0);
      expect(widths.band, 'band gutter width').toBe(widths.feature);
      expect(widths.stage, 'stage gutter width').toBe(widths.feature);
    });
  }

  // ----- 2. Gutter root carries position:sticky -----
  for (const vw of VIEWPORTS) {
    test(`gutter has position sticky at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-gutter').first().waitFor({ state: 'visible' });

      const positions = await managerPage.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.gantt-gutter')).map(
          (el) => getComputedStyle(el).position,
        ),
      );

      expect(positions.length).toBeGreaterThan(0);
      for (const pos of positions) {
        expect(pos, 'every .gantt-gutter must be sticky').toBe('sticky');
      }
    });
  }

  // ----- 3. Gutter inset-inline-start is 0px -----
  for (const vw of VIEWPORTS) {
    test(`gutter inset-inline-start is 0px at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-gutter').first().waitFor({ state: 'visible' });

      const insets = await managerPage.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.gantt-gutter')).map(
          (el) => getComputedStyle(el).insetInlineStart,
        ),
      );

      expect(insets.length).toBeGreaterThan(0);
      for (const inset of insets) {
        expect(inset, 'inset-inline-start must be 0px').toBe('0px');
      }
    });
  }

  // ----- 4. Gutter overflow is hidden -----
  for (const vw of VIEWPORTS) {
    test(`gutter overflow is hidden at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-gutter').first().waitFor({ state: 'visible' });

      const overflows = await managerPage.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.gantt-gutter')).map(
          (el) => getComputedStyle(el).overflow,
        ),
      );

      expect(overflows.length).toBeGreaterThan(0);
      for (const ov of overflows) {
        expect(ov, 'overflow must be hidden').toBe('hidden');
      }
    });
  }

  // ----- 5. Track-band gutter columns resolve to named grid areas -----
  for (const vw of VIEWPORTS) {
    test(`track-band gutter has 3-column named grid at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-track-band__gutter').first().waitFor({ state: 'visible' });

      const templateCols = await managerPage.evaluate(() => {
        const el = document.querySelector<HTMLElement>('.gantt-track-band__gutter');
        return el ? getComputedStyle(el).gridTemplateColumns : null;
      });

      expect(templateCols, 'band gutter grid-template-columns must be set').not.toBeNull();
      // 3 track values means 3 column tracks rendered
      const trackCount = (templateCols ?? '').trim().split(/\s+(?=\d|\()/).length;
      expect(trackCount, 'band gutter must have 3 column tracks (code, label, owner)').toBe(3);
    });
  }

  // ----- 6. Feature-row gutter has single-column (vertical-stack) grid -----
  for (const vw of VIEWPORTS) {
    test(`feature-row gutter has vertical-stack single-column grid at viewport ${vw}px`, async ({
      managerPage,
    }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-row__gutter').first().waitFor({ state: 'visible' });

      const templateCols = await managerPage.evaluate(() => {
        const el = document.querySelector<HTMLElement>('.gantt-row__gutter');
        return el ? getComputedStyle(el).gridTemplateColumns : null;
      });

      expect(templateCols, 'feature gutter grid-template-columns must be set').not.toBeNull();
      // single column means exactly one track value
      const trackCount = (templateCols ?? '').trim().split(/\s+(?=\d|\()/).length;
      expect(trackCount, 'feature gutter must have 1 column track (vertical-stack)').toBe(1);
    });
  }
});
