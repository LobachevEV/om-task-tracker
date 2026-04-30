import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { PlanPage } from '../pages/PlanPage';
import { isBackendReachable } from '../helpers/backend';
import {
  apiRegister,
  seedAuthInLocalStorage,
  setLanguageInLocalStorage,
} from '../helpers/auth';

const SEED_PASSWORD = 'Password123!';

async function trySeedManager(request: APIRequestContext, page: Page): Promise<boolean> {
  try {
    const email = `gates_e2e_${Date.now()}@example.com`;
    const auth = await apiRegister(request, { email, password: SEED_PASSWORD });
    await setLanguageInLocalStorage(page, 'en');
    await seedAuthInLocalStorage(page, {
      token: auth.token,
      userId: auth.userId,
      email: auth.email,
      role: 'Manager',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Iter-2 happy path for the v2 taxonomy: load /plan, see at least one feature
 * row with the 3 gate chips on its collapsed lane, expand the row, see the 2
 * track rows render, then exercise the reject inline-reason editor (FE-001-03)
 * and the approve toggle. Skips cleanly when the gateway is down so this can
 * run in CI environments without a full stack.
 */
test.describe('@integration plan gates + sub-stages', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping plan gates/sub-stages spec',
    );
  });

  test('manager expands a feature, opens the reject editor, then approves spec', async ({
    page,
    request,
  }) => {
    const seeded = await trySeedManager(request, page);
    test.skip(!seeded, 'manager seed failed — Users service likely not in Development mode');

    const plan = new PlanPage(page);
    await plan.goto();
    await expect(plan.toolbar).toBeVisible();

    // Wait briefly for the plan to settle. A fresh manager has no features
    // until createPlaceholderFeature has been seeded; skip cleanly in that
    // mode so the spec can run on a stack without the plan-level fixture.
    await page.waitForTimeout(1500);
    const firstFeatureRow = page.locator('[data-testid^="feature-row-"]').first();
    const hasFeature = await firstFeatureRow.isVisible().catch(() => false);
    test.skip(!hasFeature, 'no features in plan — skipping gates+substages walk');
    await expect(firstFeatureRow).toBeVisible({ timeout: 5_000 });

    // Collapsed lane: spec gate + both prep gates must all be reachable
    // without expanding (UX-001-02).
    await expect(firstFeatureRow.getByTestId('gate-chip-spec')).toBeVisible();
    await expect(
      firstFeatureRow.getByTestId('gate-chip-collapsed-backend.prep-gate'),
    ).toBeVisible();
    await expect(
      firstFeatureRow.getByTestId('gate-chip-collapsed-frontend.prep-gate'),
    ).toBeVisible();

    // Expand: both track rows mount.
    await firstFeatureRow.getByTestId('expand-caret').click();
    const featureIdAttr = await firstFeatureRow.getAttribute('data-testid');
    const featureId = featureIdAttr?.replace('feature-row-', '');
    expect(featureId).toBeTruthy();

    await expect(
      page.getByTestId(`track-row-${featureId}-backend`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`track-row-${featureId}-frontend`),
    ).toBeVisible();

    // Open the reject editor on the spec gate inside the expanded row's
    // gutter — the COLLAPSED chip gets a separate testIdScope so the bare
    // 'gate-chip-spec' selector still resolves to the in-row chip when the
    // row is expanded.
    const specChip = page.locator('[data-testid="gate-chip-spec"]').last();
    const rejectBtn = specChip.getByTestId('gate-chip-spec-reject');

    // If the spec gate is already approved we click reject to open editor;
    // otherwise it's already rejectable. We just confirm the reason input
    // appears OR (for an already-rejected gate) the click re-opens to waiting.
    await rejectBtn.click();
    const reasonInput = specChip.getByTestId('gate-chip-spec-reason-input');
    if (await reasonInput.isVisible().catch(() => false)) {
      // Submit empty → expect inline error, no PATCH fired.
      await specChip.getByTestId('gate-chip-spec-reason-submit').click();
      await expect(
        specChip.getByTestId('gate-chip-spec-reason-error'),
      ).toBeVisible();
      // Cancel out of the editor without firing the PATCH.
      await specChip.locator('input[data-testid="gate-chip-spec-reason-input"]').press('Escape');
    }

    // Approve flow on the spec gate. The button is always present when
    // canEdit and the row is rendered.
    const approveBtn = specChip.getByTestId('gate-chip-spec-approve');
    await approveBtn.click();
    await expect(specChip).toHaveAttribute('data-status', /approved|waiting/);
  });
});
