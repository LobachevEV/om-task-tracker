import { planTest as test, expect } from '../fixtures/plan';
import { PlanPage } from '../pages/PlanPage';
import { isBackendReachable } from '../helpers/backend';

// Requires: Gateway (5000) → Users / Tasks / Features gRPC. Skips cleanly when
// the stack is down, mirroring task-lifecycle.spec.ts.
test.describe('@integration plan happy path', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping plan happy-path specs',
    );
  });

  test('manager creates and fills a feature, then sees it on the Plan', async ({
    planPage,
    seeded,
  }) => {
    const plan = new PlanPage(planPage);

    // 1. Manager lands on /plan via the role-aware home redirect from spec 13.
    await planPage.goto('/');
    await expect(planPage).toHaveURL(/\/plan$/);
    await expect(plan.toolbar).toBeVisible();

    // 2. Create a new feature via the toolbar CTA.
    await plan.openCreateFeatureDialog();

    const uniqueTitle = `E2E Feature ${Date.now()}`;
    await plan.fillCreateFeatureForm({
      title: uniqueTitle,
      plannedStart: '2026-05-01',
      plannedEnd: '2026-05-15',
    });
    const createStatus = await plan.submitCreateFeature();
    test.skip(
      createStatus === 502 || createStatus === 503,
      `Features service returned ${createStatus} — downstream not running`,
    );
    expect(createStatus).toBeGreaterThanOrEqual(200);
    expect(createStatus).toBeLessThan(300);

    // 3. GanttPage.handleCreated(id) closes the create dialog and calls
    //    state.openFeature(id), so the FeatureDrawer auto-opens pointing at
    //    the freshly-created feature. The drawer heading echoes the title.
    const drawer = plan.featureDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { name: uniqueTitle })).toBeVisible();

    // 4. Attach the seeded task (created against the placeholder "Setup"
    //    feature by the fixture) — this exercises the reassign-on-attach path.
    const attachStatus = await plan.attachTaskToOpenFeature(seeded.jiraTaskId);
    test.skip(
      attachStatus === 502 || attachStatus === 503,
      `attach returned ${attachStatus} — downstream not running`,
    );
    expect(attachStatus).toBeGreaterThanOrEqual(200);
    expect(attachStatus).toBeLessThan(300);

    // 5. The attach form clears its input on success; the drawer task list
    //    may not repaint until GET /api/plan/features/{id} returns, but the
    //    response-wait above guarantees the POST completed. The drawer is
    //    still on-screen for the close step.
    await plan.closeFeatureDrawer();

    // 6. Zoom cycling via keyboard. week → twoWeeks → month.
    await planPage.keyboard.press('z');
    await planPage.keyboard.press('z');
    await plan.expectZoomActive('month');
  });

  test('developer cannot edit features', async ({ developerPage, seeded }) => {
    const plan = new PlanPage(developerPage);

    // 1. /plan is accessible to everyone — it's the Gantt view that non-
    //    managers see in read-only mode (spec 13 only redirects the /home
    //    route, not /plan).
    await plan.goto();
    await expect(plan.toolbar).toBeVisible();

    // 2. "New feature" CTA is Manager-only (GanttToolbar renders it only
    //    when role === 'Manager'). This is the primary assertion.
    await expect(plan.newFeatureButton).toHaveCount(0);

    // 3. Open the placeholder feature drawer created by the fixture. The
    //    button is the GanttFeatureRow gutter title whose name begins with
    //    the feature title ("Setup").
    await plan.openFeatureRow('Setup');
    const drawer = plan.featureDrawer;

    // 4. FeatureDrawer renders the footer "Edit" button and the "Attach"
    //    form only when canEdit === true. For a non-manager both must be
    //    absent.
    await expect(
      drawer.getByRole('button', { name: /^(?:edit|изменить)$/i }),
    ).toHaveCount(0);
    await expect(
      drawer.getByRole('button', { name: /^(?:attach|прикрепить)$/i }),
    ).toHaveCount(0);

    // 5. /tasks is still reachable directly for non-managers (the home
    //    redirect sends them here, and the route is authorised for all
    //    signed-in users).
    void seeded;
    await developerPage.goto('/tasks');
    await expect(developerPage).toHaveURL(/\/tasks$/);
  });
});
