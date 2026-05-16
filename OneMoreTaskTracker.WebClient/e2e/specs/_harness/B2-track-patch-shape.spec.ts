import { test, expect } from '../../fixtures/authed';
import { isBackendReachable } from '../../helpers/backend';
import { API_BASE_URL } from '../../helpers/auth';

/**
 * @harness B2 — track-patch-shape contract regression
 *
 * Before fix da9e16f, every successful inline track / track-stage PATCH
 * (200 OK) was rejected by the FE Zod schema (`featureTrackSchema` vs.
 * server-returned `FeatureSummary`) and bubbled up as
 * `{ kind: 'network', message: "Couldn't read server response. Retry?" }`.
 * The cell rolled back to its previous value, even though the DB had been
 * updated. This spec exercises the success path end-to-end:
 *
 *   1. log in as the manager seed, open /plan,
 *   2. drive an inline edit on the Backend > Development planned-start
 *      cell of feature 1 (Charlie Backend's row in "Checkout redesign"),
 *   3. assert the cell renders the new value (no rollback) AND
 *   4. assert no `[data-testid="inline-cell-error"][data-kind="network"]`
 *      appears, AND
 *   5. fetch `GET /api/plan/features/1` directly and assert the BE has
 *      persisted the same date that the FE committed.
 *
 * Note on date choice: the brief proposes `2026-05-20`, but the seed places
 * Backend CsApproving at 2026-07-10..2026-07-23 so any date earlier than
 * 2026-07-24 would trip the no-stage-overlap validator (422). The spec
 * picks `2026-07-25` instead — one day after the seeded start — which is
 * safely inside the Backend Development window (seed: 2026-07-24..2026-08-06)
 * and exercises the same 200 path the bug used to break.
 */

const TARGET_FEATURE_ID = 1;
const TARGET_KIND = 'Backend';
const TARGET_STAGE_KEY = 'Development';

test.describe('@harness B2 — successful track-stage PATCH must not roll back', () => {
  // The spec drives a real BE PATCH against the seeded DB row. Running it in
  // three browser projects in parallel would have the workers race on the
  // same stage record (last writer wins; the loser's GET sees a different
  // date and the assertion flaps). Pin to chromium so the contract test is
  // deterministic; the bug under test is a pure FE↔BE wire-shape mismatch
  // and is identical across engines.
  test.skip(({ browserName }) => browserName !== 'chromium', 'B2 mutates seeded DB — chromium-only');

  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping B2 track-patch-shape spec',
    );
  });

  test('inline edit on Backend > Development planned-start commits + persists (AC#1–#3)', async ({
    managerPage,
    auth,
  }) => {
    // Discover the seeded value range BEFORE the edit so the new date stays
    // inside the no-stage-overlap window (start must be ≥ previous stage's
    // plannedEnd AND ≤ this stage's plannedEnd). Pick a date that is
    // different from the current one — the bug rolled back to the prior
    // value, so the assertion must fail if the rollback returns.
    const initialResponse = await managerPage.request.get(
      `${API_BASE_URL}/api/plan/features/${TARGET_FEATURE_ID}`,
      { headers: { Authorization: `Bearer ${auth.token}` } },
    );
    expect(initialResponse.ok(), `initial GET expected 2xx, got ${initialResponse.status()}`).toBeTruthy();
    const initialBody = (await initialResponse.json()) as {
      tracks?: Array<{
        kind: string;
        stages: Array<{ stageKey: string; plannedStart: string | null; plannedEnd: string | null }>;
      }>;
    };
    const backendStages = initialBody.tracks?.find((t) => t.kind === TARGET_KIND)?.stages ?? [];
    const beforeStart = backendStages.find((s) => s.stageKey === TARGET_STAGE_KEY)?.plannedStart;
    expect(beforeStart, 'seeded Backend > Development plannedStart must exist').toBeTruthy();

    // Shift by ±1 day, staying inside the valid window. Pick whichever
    // direction lands inside [csApprovingEnd, developmentEnd].
    const csApprovingEnd = backendStages.find((s) => s.stageKey === 'CsApproving')?.plannedEnd;
    const developmentEnd = backendStages.find((s) => s.stageKey === TARGET_STAGE_KEY)?.plannedEnd;
    expect(csApprovingEnd, 'CsApproving plannedEnd must exist').toBeTruthy();
    expect(developmentEnd, 'Development plannedEnd must exist').toBeTruthy();

    function shiftIsoByDays(iso: string, deltaDays: number): string {
      const d = new Date(`${iso}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + deltaDays);
      return d.toISOString().slice(0, 10);
    }
    const candidatePlus = shiftIsoByDays(beforeStart!, 1);
    const candidateMinus = shiftIsoByDays(beforeStart!, -1);
    const NEW_ISO_DATE =
      candidatePlus <= developmentEnd!
        ? candidatePlus
        : candidateMinus >= csApprovingEnd!
          ? candidateMinus
          : beforeStart!;
    expect(
      NEW_ISO_DATE,
      'must be able to pick a valid neighbouring date inside the no-overlap window',
    ).not.toEqual(beforeStart);

    const expectedDisplay = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${NEW_ISO_DATE}T00:00:00Z`));

    await managerPage.setViewportSize({ width: 1440, height: 900 });
    await managerPage.goto('/plan');
    await managerPage.locator('.gantt-page__header-row').waitFor({ state: 'visible' });

    const featureRow = managerPage.locator(`[data-testid="feature-row-${TARGET_FEATURE_ID}"]`);
    await expect(featureRow, 'feature 1 row must render').toHaveCount(1);

    const startCellTestId = `track-stage-start-${TARGET_FEATURE_ID}-${TARGET_KIND}-${TARGET_STAGE_KEY}`;
    const dateCell = managerPage.locator(`[data-testid="${startCellTestId}"]`);
    const dateInput = dateCell.locator(`[data-testid="${startCellTestId}-input"]`);

    await dateInput.waitFor({ state: 'attached' });
    await dateInput.scrollIntoViewIfNeeded();

    // Drive the edit: focus, clear, type the new ISO date, press Enter.
    await dateInput.click();
    await dateInput.fill('');
    await dateInput.fill(NEW_ISO_DATE);
    await dateInput.press('Enter');

    // AC#1 — cell shows the new formatted value (NOT "—", NOT the prior date).
    // The display value is locale-aware short date; en-US Intl renders
    // e.g. `2026-05-11` as `May 11`. While focused, the input shows the
    // draft; once committed and status === 'idle' it shows the formatted
    // committed value via formatShortDate(value, locale).
    await expect
      .poll(
        async () => (await dateInput.inputValue()).trim(),
        {
          timeout: 5_000,
          message: `cell must render the committed value "${expectedDisplay}" or the ISO "${NEW_ISO_DATE}"`,
        },
      )
      .toMatch(new RegExp(`${expectedDisplay}|${NEW_ISO_DATE}`));

    // AC#2 — no network-shape error surfaced anywhere on the page.
    // This is the precise rollback signal the bug produced.
    const networkError = managerPage.locator(
      '[data-testid="inline-cell-error"][data-kind="network"]',
    );
    await expect(
      networkError,
      'no inline-cell-error with kind=network may appear after a successful PATCH',
    ).toHaveCount(0);

    // AC#3 — BE truly persisted the value: GET /api/plan/features/1
    // returns the same date for the Backend > Development stage.
    const apiResponse = await managerPage.request.get(
      `${API_BASE_URL}/api/plan/features/${TARGET_FEATURE_ID}`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    );
    expect(
      apiResponse.ok(),
      `GET /api/plan/features/${TARGET_FEATURE_ID} expected 2xx, got ${apiResponse.status()}`,
    ).toBeTruthy();

    const body = (await apiResponse.json()) as {
      tracks?: Array<{
        kind: string;
        stages: Array<{ stageKey: string; plannedStart: string | null }>;
      }>;
    };
    const backendTrack = body.tracks?.find((t) => t.kind === TARGET_KIND);
    expect(
      backendTrack,
      `feature ${TARGET_FEATURE_ID} must expose a ${TARGET_KIND} track`,
    ).toBeDefined();

    const developmentStage = backendTrack!.stages.find((s) => s.stageKey === TARGET_STAGE_KEY);
    expect(
      developmentStage,
      `${TARGET_KIND} track must expose the ${TARGET_STAGE_KEY} stage`,
    ).toBeDefined();
    expect(
      developmentStage!.plannedStart,
      `BE must persist plannedStart="${NEW_ISO_DATE}" — silent-save regression if mismatched`,
    ).toBe(NEW_ISO_DATE);
  });
});
