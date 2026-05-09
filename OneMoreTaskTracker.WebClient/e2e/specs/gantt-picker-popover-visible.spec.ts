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

  // ----- Bug 2: Date calendar fully visible after open -----
  for (const vw of VIEWPORTS) {
    test(`Bug 2: date calendar visible at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 1000 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
      await managerPage.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

      // The calendar trigger is a separate <button> inside the date cell;
      // its testid is `<dateCellTestId>-calendar-btn` per InlineDateCell.tsx.
      const calendarBtn = managerPage
        .locator('[data-testid^="track-stage-start-"] [data-testid$="-calendar-btn"]')
        .first();
      await calendarBtn.scrollIntoViewIfNeeded();
      await calendarBtn.click();

      const calendar = managerPage.locator('.inline-date-calendar').first();
      await calendar.waitFor({ state: 'attached', timeout: 5_000 });

      const probe = await managerPage.evaluate(() => {
        const cal = document.querySelector<HTMLElement>('.inline-date-calendar');
        if (!cal) return { found: false } as const;
        const r = cal.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const stack = document.elementsFromPoint(cx, cy);
        const topInside = stack.some((el) => el === cal || cal.contains(el));
        const topClass = stack[0]?.className ?? '';
        const dayCells = Array.from(cal.querySelectorAll<HTMLElement>('.rdp-day, button[role="gridcell"]'));
        const dayWidths = dayCells.map((d) => Math.round(d.getBoundingClientRect().width));
        const anyDayHittable = dayCells.some((d) => {
          const dr = d.getBoundingClientRect();
          if (dr.width <= 0 || dr.height <= 0) return false;
          const dcx = dr.left + dr.width / 2;
          const dcy = dr.top + dr.height / 2;
          const dstack = document.elementsFromPoint(dcx, dcy);
          return dstack.some((el) => el === d || d.contains(el));
        });
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
          topInside,
          topClass: typeof topClass === 'string' ? topClass : '',
          dayCount: dayCells.length,
          maxDayWidth: dayWidths.length > 0 ? Math.max(...dayWidths) : 0,
          anyDayHittable,
        } as const;
      });

      expect(probe.found, 'calendar node attached to DOM').toBe(true);
      if (!probe.found) return;

      expect(probe.width, `calendar width must be > 0 at vw=${vw}`).toBeGreaterThan(0);
      expect(probe.height, `calendar height must be > 0 at vw=${vw}`).toBeGreaterThan(0);

      expect(probe.x, `calendar left edge inside viewport at vw=${vw}`).toBeGreaterThanOrEqual(0);
      expect(probe.y, `calendar top edge inside viewport at vw=${vw}`).toBeGreaterThanOrEqual(0);
      expect(probe.right, `calendar right edge inside viewport at vw=${vw}`).toBeLessThanOrEqual(probe.vw);
      expect(probe.bottom, `calendar bottom edge inside viewport at vw=${vw}`).toBeLessThanOrEqual(probe.vh);

      expect(probe.dayCount, `calendar must render day cells at vw=${vw}`).toBeGreaterThan(0);
      expect(probe.maxDayWidth, `at least one day cell width > 0 at vw=${vw}`).toBeGreaterThan(0);
      expect(
        probe.anyDayHittable,
        `at least one day cell must be hit-testable at vw=${vw} (top class at calendar center: "${probe.topClass}")`,
      ).toBe(true);
    });
  }

  // ----- Bug 2b: Calendar day click commits the new ISO via editor.commit -----
  test('Bug 2b: clicking a day commits the new ISO into the date input', async ({ managerPage }) => {
    await managerPage.setViewportSize({ width: 1440, height: 1000 });
    await managerPage.goto('/plan');
    await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
    await managerPage.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

    // Capture the start-date input's current value.
    const dateCell = managerPage.locator('[data-testid^="track-stage-start-"]').first();
    const dateInput = dateCell.locator('input[data-testid$="-input"]').first();
    await dateInput.waitFor({ state: 'attached' });
    const before = (await dateInput.inputValue()).trim();

    const calendarBtn = dateCell.locator('[data-testid$="-calendar-btn"]').first();
    await calendarBtn.scrollIntoViewIfNeeded();
    await calendarBtn.click();

    const calendar = managerPage.locator('.inline-date-calendar').first();
    await calendar.waitFor({ state: 'attached' });

    // Pick a day that is NOT today's selected day. Prefer an enabled day cell
    // that is not currently selected and not outside the displayed month.
    const day = calendar
      .locator('.rdp-day-btn:not([disabled])')
      .filter({ hasNot: managerPage.locator('.rdp-day--selected') })
      .first();
    await day.waitFor({ state: 'attached' });
    await day.click();

    // The input value must change (commit propagated through editor.commit).
    // The display format is locale-aware short date (e.g. "May 15"), not ISO,
    // so we just assert the value differs from `before`.
    await expect
      .poll(async () => (await dateInput.inputValue()).trim(), {
        timeout: 5_000,
        message: 'date input value must change after calendar day click',
      })
      .not.toEqual(before);
  });

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

    // Open + close calendar.
    const calendarBtn = managerPage
      .locator('[data-testid^="track-stage-start-"] [data-testid$="-calendar-btn"]')
      .first();
    await calendarBtn.click();
    await managerPage.locator('.inline-date-calendar').first().waitFor({ state: 'attached' });
    await managerPage.keyboard.press('Escape');

    expect(
      errors,
      `app console errors during /plan picker open/close: ${errors.join(' | ')}`,
    ).toEqual([]);
  });
});
