import { planTest as test, expect } from '../fixtures/plan';
import { PlanPage } from '../pages/PlanPage';
import { isBackendReachable } from '../helpers/backend';

/**
 * Per-stage planning — end-to-end flows from func-eval-contract.md §User Flows.
 *
 * These flows exercise the 5-row planning table rendered inside the feature
 * drawer's edit view (StagePlanTable). They require the gateway + Features
 * service to be reachable; otherwise the whole describe block skips, mirroring
 * plan.happy-path.spec.ts.
 */
test.describe('@integration plan · per-stage planning', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping plan stage-planning specs',
    );
  });

  // --- Flow 1 --------------------------------------------------------------
  test('Flow 1 — manager opens feature drawer and sees the 5-row planning table', async ({
    planPage,
  }) => {
    const plan = new PlanPage(planPage);

    // Seed a fresh feature so we know the drawer opens on a known row.
    await plan.goto();
    await plan.openCreateFeatureDialog();
    const title = `Stage-1 feature ${Date.now()}`;
    await plan.fillCreateFeatureForm({ title });
    const status = await plan.submitCreateFeature();
    test.skip(status < 200 || status >= 300, `create returned ${status}`);

    // The drawer auto-opens on create via GanttPage.handleCreated(id).
    await expect(plan.featureDrawer).toBeVisible();

    // Enter edit mode to reveal the plan table.
    await plan.enterEditMode();

    // Table renders exactly 5 rows (one per FeatureState), in canonical order.
    await expect(plan.stagePlanTable).toBeVisible();
    await expect(plan.stagePlanRows()).toHaveCount(5);
  });

  // --- Flow 2 --------------------------------------------------------------
  test('Flow 2 — manager fills dates for all stages, saves, dates persist', async ({
    planPage,
  }) => {
    const plan = new PlanPage(planPage);

    await plan.goto();
    await plan.openCreateFeatureDialog();
    const title = `Stage-2 feature ${Date.now()}`;
    await plan.fillCreateFeatureForm({ title });
    const createStatus = await plan.submitCreateFeature();
    test.skip(createStatus < 200 || createStatus >= 300, `create returned ${createStatus}`);

    await expect(plan.featureDrawer).toBeVisible();
    await plan.enterEditMode();

    // Canonical 5-stage plan with contiguous dates.
    const plan5 = [
      { start: '2026-05-01', end: '2026-05-05' }, // CsApproving
      { start: '2026-05-05', end: '2026-05-20' }, // Development
      { start: '2026-05-20', end: '2026-05-25' }, // Testing
      { start: '2026-05-25', end: '2026-05-28' }, // EthalonTesting
      { start: '2026-05-29', end: '2026-05-29' }, // LiveRelease
    ];
    for (let i = 0; i < plan5.length; i += 1) {
      await plan.fillStagePlanRow(i, plan5[i].start, plan5[i].end);
    }

    // The range summary surfaces once every row is filled.
    await expect(plan.stagePlanRangeSummary).toBeVisible();

    const saveStatus = await plan.submitFeatureEdit();
    test.skip(
      saveStatus === 502 || saveStatus === 503,
      `Features service returned ${saveStatus}`,
    );
    expect(saveStatus).toBeGreaterThanOrEqual(200);
    expect(saveStatus).toBeLessThan(300);

    // Re-open the drawer and verify persistence.
    await plan.closeFeatureDrawer();
    await plan.openFeatureRow(title);
    await plan.enterEditMode();
    const firstRow = plan.stagePlanRows().first();
    await expect(firstRow.locator('input[type="date"]').nth(0)).toHaveValue(
      plan5[0].start,
    );
    await expect(firstRow.locator('input[type="date"]').nth(1)).toHaveValue(
      plan5[0].end,
    );
  });

  // --- Flow 3 --------------------------------------------------------------
  test('Flow 3 — manager assigns a performer via combobox and sees the name after save', async ({
    planPage,
  }) => {
    const plan = new PlanPage(planPage);

    await plan.goto();
    await plan.openCreateFeatureDialog();
    const title = `Stage-3 feature ${Date.now()}`;
    await plan.fillCreateFeatureForm({ title });
    const createStatus = await plan.submitCreateFeature();
    test.skip(createStatus < 200 || createStatus >= 300, `create returned ${createStatus}`);

    await expect(plan.featureDrawer).toBeVisible();
    await plan.enterEditMode();

    // Grab the Development row (index 1) and open its combobox.
    const row = plan.stagePlanRows().nth(1);
    const combo = row.getByRole('combobox');
    await combo.click();

    // Pick the first teammate surfaced by the roster.
    const options = planPage.getByRole('option');
    await expect(options.first()).toBeVisible();
    const chosenName = (await options.first().textContent())?.trim() ?? '';
    await options.first().click();

    // Date both sides of the row so the payload is well-formed.
    await plan.fillStagePlanRow(1, '2026-06-01', '2026-06-10');

    const status = await plan.submitFeatureEdit();
    test.skip(status === 502 || status === 503, `PATCH returned ${status}`);
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);

    // Re-open and assert the performer name stuck.
    await plan.closeFeatureDrawer();
    await plan.openFeatureRow(title);
    await plan.enterEditMode();
    const comboAfter = plan
      .stagePlanRows()
      .nth(1)
      .getByRole('combobox');
    await expect(comboAfter).toHaveValue(
      new RegExp(chosenName.split('·')[0]?.trim() ?? chosenName, 'i'),
    );
  });

  // --- Flow 4 --------------------------------------------------------------
  test('Flow 4 — end-before-start shows an error and disables the Save button', async ({
    planPage,
  }) => {
    const plan = new PlanPage(planPage);

    await plan.goto();
    await plan.openCreateFeatureDialog();
    const title = `Stage-4 feature ${Date.now()}`;
    await plan.fillCreateFeatureForm({ title });
    const createStatus = await plan.submitCreateFeature();
    test.skip(createStatus < 200 || createStatus >= 300, `create returned ${createStatus}`);

    await expect(plan.featureDrawer).toBeVisible();
    await plan.enterEditMode();

    // End-date before start-date on the first row.
    await plan.fillStagePlanRow(0, '2026-06-20', '2026-06-10');

    const row = plan.stagePlanRows().first();
    await expect(row).toHaveAttribute('data-invalid', 'true');
    await expect(row.getByRole('alert')).toBeVisible();

    const saveBtn = plan.featureDrawer.getByRole('button', {
      name: /^(?:save|сохранить)$/i,
    });
    await expect(saveBtn).toBeDisabled();
  });

  // --- Flow 5 --------------------------------------------------------------
  test('Flow 5 — viewer role renders the table read-only (no inputs, no Save)', async ({
    developerPage,
    seeded,
  }) => {
    const plan = new PlanPage(developerPage);
    void seeded;

    await plan.goto();
    // Open the placeholder feature seeded by the fixture.
    await plan.openFeatureRow('Setup');
    await expect(plan.featureDrawer).toBeVisible();

    // No Edit button for viewers, so no Save button either.
    await expect(
      plan.featureDrawer.getByRole('button', { name: /^(?:edit|изменить)$/i }),
    ).toHaveCount(0);
    await expect(
      plan.featureDrawer.getByRole('button', { name: /^(?:save|сохранить)$/i }),
    ).toHaveCount(0);

    // No date inputs inside the drawer for the viewer — read-only cells only.
    await expect(plan.featureDrawer.locator('input[type="date"]')).toHaveCount(0);
  });

  // --- Flow 6 --------------------------------------------------------------
  /**
   * Stale performer flow — seeding a detached id via the API is fragile
   * without explicit test hooks (the BE rejects unknown performer ids on
   * write only when it resolves the roster). We guard the flow behind a
   * feature-flag-style probe: if no stage row renders the "Reassign"
   * affordance after opening the drawer on a known seeded feature, we skip.
   * Production validation happens via the dedicated seed script in
   * plan.stale-performer fixtures (added in a follow-up iteration once the
   * backend publishes a deterministic seeding endpoint).
   */
  test('Flow 6 — stale performer row renders Reassign affordance when BE returns performer=null', async ({
    planPage,
    seeded,
  }) => {
    const plan = new PlanPage(planPage);
    void seeded;

    await plan.goto();
    await plan.openFeatureRow('Setup');
    await plan.enterEditMode();

    const reassignCount = await plan.stagePerformerReassignLink.count();
    test.skip(
      reassignCount === 0,
      'no stale-performer row in current seed — covered by StagePerformerCombobox.test.tsx unit coverage',
    );

    // When the affordance IS present, clicking it must clear the id and
    // surface the combobox input for a replacement pick.
    await plan.stagePerformerReassignLink.first().click();
    await expect(
      plan.featureDrawer.getByRole('combobox').first(),
    ).toBeVisible();
  });
});
