import { expect, test } from '../fixtures/authed';
import { LoginPage } from '../pages/LoginPage';
import { AppHeader } from '../pages/AppHeader';
import { TeamPageObject } from '../pages/TeamPage';
import { LANG_KEY, setLanguageInLocalStorage } from '../helpers/auth';
import { isBackendReachable } from '../helpers/backend';

test.describe('i18n RU/EN switcher on public pages', () => {
  test('defaults to RU when no saved language', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.login-card__subtitle')).toHaveText('Войдите в систему');
    await expect(page.getByRole('link', { name: 'Зарегистрироваться' })).toBeVisible();
  });

  test('honors saved EN in localStorage', async ({ page }) => {
    await setLanguageInLocalStorage(page, 'en');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page.locator('.login-card__subtitle')).toHaveText('Sign in');
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });
});

test.describe('i18n RU/EN switcher on authenticated pages', () => {
  test.beforeAll(async () => {
    test.skip(!(await isBackendReachable()), 'gateway at :5000 unreachable — skipping authenticated i18n specs');
  });

  test('switches RU → EN and updates header + team title', async ({ managerPage }) => {
    await setLanguageInLocalStorage(managerPage, 'ru');

    const teamPage = new TeamPageObject(managerPage);
    await teamPage.goto();
    await expect(teamPage.title).toHaveText('Моя команда');

    const header = new AppHeader(managerPage);
    await expect(header.langRu).toHaveAttribute('aria-pressed', 'true');

    await header.switchLanguage('en');
    await expect(header.langEn).toHaveAttribute('aria-pressed', 'true');
    await expect(header.langRu).toHaveAttribute('aria-pressed', 'false');
    await expect(teamPage.title).toHaveText('My team');
    await expect(header.tasksTab).toHaveText('Tasks');
    await expect(header.teamTab).toHaveText('Team');
    await expect(header.logoutButton).toHaveText('Log out');
  });

  // Regression guard: addInitScript runs on every navigation, so pre-seeding
  // a language here would silently overwrite the switched value on reload.
  test('persists language choice across reload', async ({ managerPage }) => {
    await managerPage.goto('/team');

    const header = new AppHeader(managerPage);
    await header.switchLanguage('en');
    await expect
      .poll(() => managerPage.evaluate((key) => window.localStorage.getItem(key), LANG_KEY))
      .toBe('en');

    await managerPage.reload();
    const teamPage = new TeamPageObject(managerPage);
    await expect(teamPage.title).toHaveText('My team');
  });

  test('round-trips EN → RU → EN without losing authentication', async ({ managerPage }) => {
    await managerPage.goto('/team');
    const header = new AppHeader(managerPage);

    await header.switchLanguage('en');
    await expect(header.logoutButton).toHaveText('Log out');

    await header.switchLanguage('ru');
    await expect(header.logoutButton).toHaveText('Выйти');

    await header.switchLanguage('en');
    await expect(header.logoutButton).toHaveText('Log out');

    await expect(managerPage).toHaveURL(/\/team$/);
  });
});
