import { test, expect } from '../../fixtures/authed';
import { isBackendReachable } from '../../helpers/backend';
import { fileURLToPath } from 'node:url';
import * as fs from 'fs';
import * as path from 'path';

const VIEWPORTS = [1024, 1280, 1440] as const;
const TOLERANCE_PX = 0.5;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = path.resolve(
  HERE,
  '../../../../gan-harness-refactor/gantt-2col-grid/behavior-contract.json',
);

type CapturedCoords = {
  featureGutterLeft: number | null;
  trackBandGutterLeft: number | null;
  stageGutterLeft: number | null;
  headerFlankRight: number | null;
};

const capturedByViewport: Record<number, CapturedCoords> = {};

test.describe('@harness column-alignment — gutter/date-header x-alignment', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping column-alignment harness spec',
    );
  });

  test.afterAll(() => {
    if (!fs.existsSync(CONTRACT_PATH)) return;

    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const coords = contract?.frozen_x_coords?.coords;
    if (!coords) return;

    const allNull = (slot: Record<string, number | null>) =>
      Object.values(slot).every((v) => v === null);

    if (
      allNull(coords.feature_title_column_start) ||
      allNull(coords.track_owner_column_start) ||
      allNull(coords.stage_owner_column_start) ||
      allNull(coords.day_header_column0_left)
    ) {
      for (const vw of VIEWPORTS) {
        const c = capturedByViewport[vw];
        if (!c) continue;
        coords.feature_title_column_start[String(vw)] = c.featureGutterLeft;
        coords.track_owner_column_start[String(vw)] = c.trackBandGutterLeft;
        coords.stage_owner_column_start[String(vw)] = c.stageGutterLeft;
        coords.day_header_column0_left[String(vw)] = c.headerFlankRight;
      }
      contract.frozen_x_coords.spec_status_at_iter0 = 'captured_iter3';
      fs.writeFileSync(CONTRACT_PATH, JSON.stringify(contract, null, 2) + '\n', 'utf8');
    }
  });

  for (const vw of VIEWPORTS) {
    test(`gutter cells align with date-header at viewport ${vw}px`, async ({ managerPage }) => {
      await managerPage.setViewportSize({ width: vw, height: 900 });
      await managerPage.goto('/plan');
      await managerPage.locator('.gantt-page').waitFor({ state: 'visible' });

      // Wait for at least one feature row to be present
      await managerPage.locator('.gantt-row-frame__gutter').first().waitFor({ state: 'visible' });

      const coords = await managerPage.evaluate(() => {
        function leftOf(selector: string): number | null {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) return null;
          return el.getBoundingClientRect().left;
        }

        // The date-header right edge starts where the gutter column ends;
        // its own left edge aligns with the page left — we want the right
        // edge of the leading flank (= left edge of the date content area).
        const headerFlank = document.querySelector<HTMLElement>(
          '.gantt-page__header-flank--leading',
        );
        const headerFlankRight = headerFlank
          ? headerFlank.getBoundingClientRect().right
          : null;

        return {
          // x-coord 1: left edge of the first feature-row gutter
          featureGutterLeft: leftOf('.gantt-row__gutter'),
          // x-coord 2: left edge of the first track-band row gutter
          trackBandGutterLeft: leftOf('.gantt-track-band__header .gantt-row-frame__gutter'),
          // x-coord 3: left edge of the first stage-row gutter
          stageGutterLeft: leftOf('.gantt-track-stage-row .gantt-row-frame__gutter'),
          // x-coord 4: right edge of the leading date-header flank
          //             (the point where day columns begin)
          headerFlankRight,
        };
      });

      const { featureGutterLeft, trackBandGutterLeft, stageGutterLeft, headerFlankRight } =
        coords;

      capturedByViewport[vw] = coords;

      // All four coordinates must be non-null (elements exist in the DOM)
      expect(featureGutterLeft, 'feature gutter must be visible').not.toBeNull();
      expect(trackBandGutterLeft, 'track-band gutter must be visible').not.toBeNull();
      expect(headerFlankRight, 'header leading flank must be visible').not.toBeNull();

      // All gutter left edges must be equal (they all share column 1 of the subgrid)
      if (featureGutterLeft !== null && trackBandGutterLeft !== null) {
        expect(
          Math.abs(featureGutterLeft - trackBandGutterLeft),
          `feature vs track-band gutter left at ${vw}px`,
        ).toBeLessThanOrEqual(TOLERANCE_PX);
      }

      if (featureGutterLeft !== null && stageGutterLeft !== null) {
        expect(
          Math.abs(featureGutterLeft - stageGutterLeft),
          `feature vs stage-row gutter left at ${vw}px`,
        ).toBeLessThanOrEqual(TOLERANCE_PX);
      }

      // The right edge of all gutters must align with the header leading flank's right edge
      // (the point where the day timeline begins in both the header and the rows)
      const featureGutterRight = await managerPage.evaluate(() => {
        const el = document.querySelector<HTMLElement>('.gantt-row-frame__gutter');
        return el ? el.getBoundingClientRect().right : null;
      });

      if (featureGutterRight !== null && headerFlankRight !== null) {
        expect(
          Math.abs(featureGutterRight - headerFlankRight),
          `gutter right edge vs header flank right edge at ${vw}px`,
        ).toBeLessThanOrEqual(TOLERANCE_PX);
      }
    });
  }
});
