import { expect, test } from '../fixtures/authed';
import { TasksPageObject } from '../pages/TasksPage';
import { TaskDetailPageObject } from '../pages/TaskDetailPage';
import { isBackendReachable } from '../helpers/backend';

// Requires Gateway (5000) → Tasks gRPC (5102) → GitLab.Proxy (5176). When the
// downstream services aren't up the gateway returns 502 and specs skip cleanly.
test.describe('@integration task lifecycle', () => {
  test.beforeAll(async () => {
    test.skip(
      !(await isBackendReachable()),
      'gateway at :5000 unreachable — skipping task lifecycle specs',
    );
  });

  test('Tasks page renders and lists tasks for the manager', async ({ managerPage }) => {
    const tasks = new TasksPageObject(managerPage);
    await tasks.goto();

    await expect(tasks.newJiraInput).toBeVisible();
    await expect(tasks.createSubmit).toBeVisible();
    await expect(tasks.filterSelect).toBeVisible();
  });

  test('creates a task and surfaces it in the list', async ({ managerPage }) => {
    const tasks = new TasksPageObject(managerPage);
    await tasks.goto();

    const jiraId = `E2E-${Date.now()}`;
    const status = await tasks.createTask(jiraId);

    test.skip(status === 502 || status === 503, `Tasks service returned ${status} — downstream service not running`);
    test.skip(status === 409, 'task id collided (409) — re-run the suite');

    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);

    const row = tasks.rowByJiraId(jiraId);
    await expect(row).toBeVisible();
    await expect(row).toContainText(/NotStarted|Not Started/);
  });

  test('task detail page exposes a state stepper and next-stage control', async ({ managerPage }) => {
    const tasks = new TasksPageObject(managerPage);
    await tasks.goto();

    const jiraId = `E2E-DETAIL-${Date.now()}`;
    const status = await tasks.createTask(jiraId);
    test.skip(
      status === 502 || status === 503 || status < 200 || status >= 300,
      `create task failed with ${status}; cannot exercise detail view`,
    );

    await tasks.openTask(jiraId);

    const detail = new TaskDetailPageObject(managerPage);
    await detail.waitForLoaded();

    await expect(detail.stepperSteps).toHaveCount(6);
    await expect(detail.nextStageButton).toBeVisible();
    await expect(detail.nextStageButton).toContainText(/Next stage|Следующий/);
    await expect(detail.activeStep).toContainText(/NotStarted|Not Started/);
  });

  // Quarantined: move() requires a live GitLab (or a stub). Without one it returns 502.
  test.fixme(
    'advances NotStarted → InDev via the Next stage button',
    async ({ managerPage }) => {
      const tasks = new TasksPageObject(managerPage);
      await tasks.goto();
      const jiraId = `E2E-MOVE-${Date.now()}`;
      const status = await tasks.createTask(jiraId);
      test.skip(status < 200 || status >= 300, `create failed (${status})`);

      await tasks.openTask(jiraId);
      const detail = new TaskDetailPageObject(managerPage);
      await detail.waitForLoaded();
      const moveStatus = await detail.advanceToNextStage();
      expect(moveStatus).toBe(200);
      await expect(detail.activeStep).toContainText(/InDev|In Dev/);
    },
  );
});
