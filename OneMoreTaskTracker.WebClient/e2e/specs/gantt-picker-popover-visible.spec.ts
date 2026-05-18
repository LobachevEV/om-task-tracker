import { test, expect } from '../fixtures/authed';
import { isBackendReachable } from '../helpers/backend';

const VIEWPORTS = [1024, 1280, 1440, 1600] as const;

// Pre-existing /config.js 404 is filtered: it's an env-injection probe that
// app shells often emit and is unrelated to the Gantt picker-popover surface.
const KNOWN_UNRELATED_TEXT: RegExp[] = [/Failed to load resource:.*404/i];
const KNOWN_UNRELATED_URL: RegExp[] = [/\/config\.js$/i];

test.describe('@integration gantt picker popover visibility (visual acceptance, RED at baseline)', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping gantt picker-popover spec',
    );
  });

  // ----- Bug 1: Owner listbox fully visible after open -----
  for (const vw of VIEWPORTS) {
    test(`Bug 1: owner listbox visible at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 1000 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
      await managerPage.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

      // Click the first track-stage-row owner combobox to open the listbox.
      const ownerInput = managerPage
        .locator('[data-testid^="track-stage-row-"] [data-testid="track-stage-owner"] input[role="combobox"]')
        .first();
      await ownerInput.scrollIntoViewIfNeeded();
      await ownerInput.click();

      // The listbox is rendered into the DOM by InlineOwnerPicker on open.
      const listbox = managerPage.locator('.inline-cell__listbox').first();
      await listbox.waitFor({ state: 'attached', timeout: 5_000 });

      const probe = await managerPage.evaluate(() => {
        const lb = document.querySelector<HTMLElement>('.inline-cell__listbox');
        if (!lb) return { found: false } as const;
        const r = lb.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const stack = document.elementsFromPoint(cx, cy);
        const topClass = stack[0]?.className ?? '';
        const topInsideListbox = stack.some((el) => el === lb || lb.contains(el));
        return {
          found: true,
          x: Math.round(r.left),
          y: Math.round(r.top),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          width: Math.round(r.width),
          height: Math.round(r.height),
          vw: window.innerWidth,
          vh: window.innerHeight,
          topClass: typeof topClass === 'string' ? topClass : '',
          topInsideListbox,
          stackLen: stack.length,
        } as const;
      });

      expect(probe.found, 'listbox node attached to DOM').toBe(true);
      if (!probe.found) return;

      expect(probe.width, `listbox width must be > 0 at vw=${vw}`).toBeGreaterThan(0);
      expect(probe.height, `listbox height must be > 0 at vw=${vw}`).toBeGreaterThan(0);

      // Bounding box fully inside the viewport — catches "rendered offscreen"
      // and "clipped by an ancestor overflow:hidden" both as out-of-rect signals.
      expect(probe.x, `listbox left edge inside viewport at vw=${vw}`).toBeGreaterThanOrEqual(0);
      expect(probe.y, `listbox top edge inside viewport at vw=${vw}`).toBeGreaterThanOrEqual(0);
      expect(probe.right, `listbox right edge inside viewport at vw=${vw}`).toBeLessThanOrEqual(probe.vw);
      expect(probe.bottom, `listbox bottom edge inside viewport at vw=${vw}`).toBeLessThanOrEqual(probe.vh);

      // The listbox center must be hit-testable — `elementsFromPoint` at the
      // listbox center returns the listbox (or a descendant) as the topmost
      // element. This catches paint-clipping by ancestor overflow:hidden:
      // the listbox's bounding rect can intersect the viewport while every
      // pixel is clipped invisible by an ancestor.
      expect(
        probe.topInsideListbox,
        `listbox center must be the topmost element at vw=${vw} (got topClass="${probe.topClass}")`,
      ).toBe(true);
    });
  }

  // ----- Bug 1b: Owner option click commits the new value -----
  test('Bug 1b: clicking an owner option commits the new value', async ({ managerPage }) => {
    await managerPage.setViewportSize({ width: 1440, height: 1000 });
    await managerPage.goto('/plan');
    await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
    await managerPage.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

    const ownerInput = managerPage
      .locator('[data-testid^="track-stage-row-"] [data-testid="track-stage-owner"] input[role="combobox"]')
      .first();
    await ownerInput.scrollIntoViewIfNeeded();
    await ownerInput.click();

    const listbox = managerPage.locator('.inline-cell__listbox').first();
    await listbox.waitFor({ state: 'attached' });

    // Pick any visible roster option that's not currently selected. The
    // picker's `<li role="option">` carries the displayName as plain text
    // inside `.inline-cell__listbox-name`.
    const option = listbox
      .locator('li[role="option"]:not([aria-selected="true"]):not(.inline-cell__listbox-empty)')
      .first();
    await option.waitFor({ state: 'attached' });

    const optionLabel = (await option.locator('.inline-cell__listbox-name').first().textContent())?.trim() ?? '';
    expect(optionLabel.length, 'option label must be non-empty').toBeGreaterThan(0);

    // The picker uses onMouseDown to commit — click() dispatches mousedown
    // before the synthetic click, which is sufficient.
    await option.click();

    // After commit the input value reflects the picked displayName.
    await expect(ownerInput).toHaveValue(optionLabel, { timeout: 3_000 });
  });

  // ----- Bug 3: Popover width must not bloat -----
  // Catches the failure mode where `position: fixed` + `left: X` + `width: auto`
  // resolves to "fill from left to viewport's right edge" — making a popover
  // anchored to a small trigger render across most of the page. The popover
  // wrapper's bounding rect must stay tight: width ≤ POPOVER_MAX_WIDTH.
  // 500 px gives the calendar (~304 px) and listbox (capped at ~420 px by
  // its content) headroom; anything larger is a sign of a `width: auto`
  // / shrink-to-fit regression.
  const POPOVER_MAX_WIDTH = 500;

  for (const vw of VIEWPORTS) {
    test(`Bug 3a: owner listbox width is bounded at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 1000 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
      await managerPage.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

      const ownerInput = managerPage
        .locator('[data-testid^="track-stage-row-"] [data-testid="track-stage-owner"] input[role="combobox"]')
        .first();
      await ownerInput.scrollIntoViewIfNeeded();
      await ownerInput.click();

      await managerPage.locator('.inline-cell__listbox').first().waitFor({ state: 'attached' });

      // Measure the painted popover surface. The listbox can either paint
      // at its own width (when the wrapper is fit-content) or stretch to
      // the wrapper's box when the wrapper is fill-available — take the
      // max of the two, since whichever is larger is what the user sees.
      const widths = await managerPage.evaluate(() => {
        const lb = document.querySelector<HTMLElement>('.inline-cell__listbox');
        const wrapper = lb?.parentElement ?? null;
        return {
          wrapperWidth: wrapper ? Math.round(wrapper.getBoundingClientRect().width) : 0,
          listboxWidth: lb ? Math.round(lb.getBoundingClientRect().width) : 0,
        };
      });
      const paintedWidth = Math.max(widths.wrapperWidth, widths.listboxWidth);

      expect(paintedWidth, `painted owner-popover width must be > 0 at vw=${vw}`).toBeGreaterThan(0);
      expect(
        paintedWidth,
        `painted owner-popover width (max of wrapper=${widths.wrapperWidth}, listbox=${widths.listboxWidth}) must not bloat past ${POPOVER_MAX_WIDTH}px at vw=${vw}`,
      ).toBeLessThanOrEqual(POPOVER_MAX_WIDTH);
    });
  }

  // ----- Smoke: page renders, picker open/close emits no app console errors -----
  test('Smoke: Manager opens /plan + each picker, no app console errors', async ({ managerPage }) => {
    const errors: string[] = [];
    managerPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const url = msg.location()?.url ?? '';
        const ignoredByText = KNOWN_UNRELATED_TEXT.some((re) => re.test(text));
        const ignoredByUrl = KNOWN_UNRELATED_URL.some((re) => re.test(url));
        if (!ignoredByText && !ignoredByUrl) errors.push(`${text} @ ${url}`);
      }
    });
    managerPage.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await managerPage.setViewportSize({ width: 1200, height: 1227 });
    await managerPage.goto('/plan');
    await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
    await managerPage.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

    // Open + close owner picker.
    const ownerInput = managerPage
      .locator('[data-testid^="track-stage-row-"] [data-testid="track-stage-owner"] input[role="combobox"]')
      .first();
    await ownerInput.click();
    await managerPage.locator('.inline-cell__listbox').first().waitFor({ state: 'attached' });
    await managerPage.keyboard.press('Escape');

    expect(
      errors,
      `app console errors during /plan picker open/close: ${errors.join(' | ')}`,
    ).toEqual([]);
  });
});
