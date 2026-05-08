import { test, expect } from '../fixtures/authed';
import { seedAuthInLocalStorage, setLanguageInLocalStorage } from '../helpers/auth';
import { isBackendReachable } from '../helpers/backend';

const VIEWPORTS = [1024, 1280, 1440, 1600] as const;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const EN_DATE_RE = /^[A-Za-z]{3,}\.?\s+\d{1,2}$/;
const RU_DATE_RE = /^\d{1,2}\s+[А-Яа-яё.]+$/;

test.describe('@integration gantt left-panel bugs (visual acceptance, RED at baseline)', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping gantt left-panel bugs spec',
    );
  });

  // ----- Bug 1: gutter widths align -----
  for (const vw of VIEWPORTS) {
    test(`Bug 1: gutter widths align at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 1000 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
      await managerPage.locator('.gantt-row__gutter').first().waitFor({ state: 'visible' });
      await managerPage.locator('.gantt-track-band__gutter').first().waitFor({ state: 'visible' });
      await managerPage.locator('.gantt-track-stage-row__gutter').first().waitFor({ state: 'visible' });

      const widths = await managerPage.evaluate(() => ({
        feature: document.querySelector('.gantt-row__gutter')?.getBoundingClientRect().width ?? -1,
        band: document.querySelector('.gantt-track-band__gutter')?.getBoundingClientRect().width ?? -1,
        stage: document.querySelector('.gantt-track-stage-row__gutter')?.getBoundingClientRect().width ?? -1,
      }));

      expect(widths.feature, 'feature gutter width').toBeGreaterThan(0);
      expect(widths.band, 'band gutter width must equal feature gutter width').toBe(widths.feature);
      expect(widths.stage, 'stage gutter width must equal feature gutter width').toBe(widths.feature);
    });
  }

  // ----- Bug 2: owner picker reachable -----
  for (const vw of VIEWPORTS) {
    test(`Bug 2: owner picker reachable at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 1000 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });
      await managerPage.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

      const ownerWidths = await managerPage.evaluate(() => {
        const cells = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-testid^="track-stage-row-"] [data-testid="track-stage-owner"]',
          ),
        );
        return cells.map((el) => el.getBoundingClientRect().width);
      });

      expect(ownerWidths.length, 'at least one stage-owner cell rendered').toBeGreaterThan(0);
      for (const [i, w] of ownerWidths.entries()) {
        expect(
          w,
          `stage-owner cell #${i} bounding-rect width must be >= 24px (avatar)`,
        ).toBeGreaterThanOrEqual(24);
      }
    });
  }

  // ----- Bug 3: localized dates -----
  for (const locale of ['en', 'ru'] as const) {
    test(`Bug 3: localized dates (${locale})`, async ({ page, auth }) => {
      await setLanguageInLocalStorage(page, locale);
      await seedAuthInLocalStorage(page, auth);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto('/plan');
      await page.locator('.gantt-page').waitFor({ state: 'visible' });
      await page.locator('[data-testid^="track-stage-row-"]').first().waitFor({ state: 'visible' });

      const rawTexts = await page.evaluate(() => {
        const triggers = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-testid^="track-stage-start-"], [data-testid^="track-stage-end-"]',
          ),
        );
        const featureMeta = Array.from(document.querySelectorAll<HTMLElement>('.gantt-row__dates'));
        return [...triggers, ...featureMeta]
          .map((el) => (el.textContent ?? '').trim())
          .filter((t) => t.length > 0 && /\d/.test(t));
      });

      expect(rawTexts.length, `at least one date string rendered at locale ${locale}`).toBeGreaterThan(0);
      const expected = locale === 'en' ? EN_DATE_RE : RU_DATE_RE;
      for (const raw of rawTexts) {
        // Keep letters, digits, whitespace, `.` (Russian short month abbreviations
        // end in a period), `-` / `–` / `—` (range dashes), and `·` (the meta-row
        // field separator the app uses).
        const cleaned = raw.replace(/[^\p{L}\p{N}\s.\-–—·]/gu, '').trim();
        expect(cleaned, `cleaned date "${cleaned}" (raw "${raw}") must not be raw ISO`).not.toMatch(ISO_RE);
        // Split on either a dash range ("Sep 13 – Sep 30") or the `·` field
        // separator ("Jan 1 · Dec 31" — paired dates in the feature meta row).
        const parts = cleaned.split(/\s*[·–—-]+\s*/);
        for (const part of parts) {
          const p = part.trim();
          if (!p || p === '—' || /^\d+d$/.test(p) || /^\d+\/\d+\s+/.test(p)) continue;
          expect(p, `date part "${p}" (raw "${raw}") must match locale ${locale}`).toMatch(expected);
        }
      }
    });
  }

  // ----- Smoke: page renders, no app-level console errors -----
  // Pre-existing /config.js 404 is filtered: it's an env-injection probe that
  // app shells often emit and is unrelated to the Gantt left-panel surface.
  const KNOWN_UNRELATED_TEXT = [/Failed to load resource:.*404/i];
  const KNOWN_UNRELATED_URL = [/\/config\.js$/i];
  test('smoke: Manager sees feature row + track band, no app console errors', async ({ managerPage }) => {
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

    await managerPage.setViewportSize({ width: 1440, height: 1000 });
    await managerPage.goto('/plan');
    await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });

    await expect(managerPage.locator('.gantt-row__gutter').first()).toBeVisible();
    await expect(managerPage.locator('.gantt-track-band__gutter').first()).toBeVisible();
    expect(errors, `app console errors during /plan render: ${errors.join(' | ')}`).toEqual([]);
  });
});
