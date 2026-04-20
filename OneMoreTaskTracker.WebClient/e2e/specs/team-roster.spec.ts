import { expect, test } from '../fixtures/authed';
import { TeamPageObject } from '../pages/TeamPage';
import { AppHeader } from '../pages/AppHeader';
import { isBackendReachable } from '../helpers/backend';
import { DEV_DEVELOPERS, DEV_MANAGER } from '../fixtures/devSeed';
import type { SeedUser } from '../fixtures/devSeed';

const EN_ROLE_LABEL: Record<SeedUser['role'], string> = {
  Manager: 'Manager',
  FrontendDeveloper: 'Frontend',
  BackendDeveloper: 'Backend',
  Qa: 'QA',
};

test.describe('team roster', () => {
  test.beforeAll(async () => {
    test.skip(!(await isBackendReachable()), 'gateway at :5000 unreachable — skipping team roster specs');
  });

  // 8599d2a: TeamPage stopped rendering AppHeader, making the nav tabs unreachable.
  test('renders AppHeader tabs clickable from /team', async ({ managerPage }) => {
    const teamPage = new TeamPageObject(managerPage);
    await teamPage.goto();

    const header = new AppHeader(managerPage);
    await expect(header.header).toBeVisible();
    await expect(header.tasksTab).toBeVisible();
    await expect(header.teamTab).toBeVisible();

    await header.goToTasks();
    await expect(managerPage).toHaveURL(/\/$/);
  });

  test('shows the dev-seeded developers with their roles', async ({ managerPage }) => {
    const teamPage = new TeamPageObject(managerPage);
    await teamPage.goto();
    await teamPage.waitForRoster();

    await expect(teamPage.rowByEmail(DEV_MANAGER.email)).toBeVisible();

    for (const dev of DEV_DEVELOPERS) {
      const row = teamPage.rowByEmail(dev.email);
      await expect(row, `developer ${dev.email} should appear in the roster`).toBeVisible();
      await expect(row).toContainText(EN_ROLE_LABEL[dev.role]);
    }

    expect(await teamPage.memberCount()).toBeGreaterThanOrEqual(1 + DEV_DEVELOPERS.length);
  });

  test('search filters the roster to matching members', async ({ managerPage }) => {
    const teamPage = new TeamPageObject(managerPage);
    await teamPage.goto();
    await teamPage.waitForRoster();

    await teamPage.searchInput.fill('alice');
    await expect(teamPage.rowByEmail('alice.frontend@example.com')).toBeVisible();
    await expect(teamPage.rowByEmail('bob.frontend@example.com')).toBeHidden();

    await teamPage.searchInput.fill('');
    await expect(teamPage.rowByEmail('bob.frontend@example.com')).toBeVisible();
  });

  test('toolbar title respects the active locale', async ({ managerPage }) => {
    const teamPage = new TeamPageObject(managerPage);

    await teamPage.goto();
    await expect(teamPage.title).toHaveText('My team');

    const header = new AppHeader(managerPage);
    await header.switchLanguage('ru');
    await expect(teamPage.title).toHaveText('Моя команда');
  });
});
