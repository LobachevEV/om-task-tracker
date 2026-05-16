import { test, expect } from '../../fixtures/authed';
import { isBackendReachable } from '../../helpers/backend';

const VIEWPORTS = [1440, 1280] as const;

test.describe('@harness MB-001-01 — create-feature affordance visibility', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping MB-001-01 harness spec',
    );
  });

  for (const vw of VIEWPORTS) {
    test(`create-feature trigger is on-screen at ${vw}x900 on initial load (AC#1)`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page__header-row').waitFor({ state: 'visible' });

      const trigger = managerPage.locator('.add-feature-row__ghost').first();
      await expect(trigger, 'create-feature trigger must be in the DOM').toHaveCount(1);

      const box = await trigger.boundingBox();
      expect(box, 'trigger must have a bounding box (be laid out)').not.toBeNull();
      expect(
        box!.x,
        `trigger x=${box!.x} — off-screen left at ${vw}px`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        box!.x + box!.width,
        `trigger right-edge ${box!.x + box!.width} — off-screen right at ${vw}px`,
      ).toBeLessThanOrEqual(vw);
    });

    test(`create-feature input is on-screen after trigger click at ${vw}x900 (AC#2)`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.add-feature-row__ghost').first().click();

      const input = managerPage.locator('.add-feature-row__input').first();
      await expect(input).toBeVisible();
      const box = await input.boundingBox();
      expect(box, 'input must have a bounding box').not.toBeNull();
      expect(box!.x, `input x=${box!.x} — off-screen left at ${vw}px`).toBeGreaterThanOrEqual(0);
    });
  }

  test('empty-title Enter shows inline validation error (AC#3)', async ({ managerPage }) => {
    await managerPage.setViewportSize({ width: 1440, height: 900 });
    await managerPage.goto('/plan');
    await managerPage.locator('.add-feature-row__ghost').first().click();

    const input = managerPage.locator('.add-feature-row__input').first();
    await expect(input).toBeVisible();
    await input.press('Enter');

    const errorMsg = managerPage.locator('.add-feature-row__message--error').first();
    await expect(errorMsg, 'validation error message must appear after empty-title Enter').toBeVisible({ timeout: 5_000 });
  });

  test('trigger stays on-screen during horizontal timeline scroll (AC#6)', async ({ managerPage }) => {
    await managerPage.setViewportSize({ width: 1440, height: 900 });
    await managerPage.goto('/plan');
    await managerPage.locator('.gantt-page__header-row').waitFor({ state: 'visible' });

    // Scroll the timeline viewport horizontally by 500px
    await managerPage.evaluate(() => {
      const scroller = document.querySelector('.gantt-timeline-scroller__viewport');
      if (scroller) scroller.scrollLeft = 500;
    });

    const trigger = managerPage.locator('.add-feature-row__ghost').first();
    const box = await trigger.boundingBox();
    expect(box, 'trigger must remain laid out after timeline scroll').not.toBeNull();
    expect(
      box!.x,
      `trigger x=${box!.x} — went off-screen after horizontal scroll`,
    ).toBeGreaterThanOrEqual(0);
  });
});
