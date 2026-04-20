import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AppHeader } from '../pages/AppHeader';
import { AUTH_KEY, LANG_KEY, randomEmail } from '../helpers/auth';
import { isBackendReachable } from '../helpers/backend';
import { DEV_MANAGER, DEV_SEED_PASSWORD } from '../fixtures/devSeed';

test.describe('auth flow', () => {
  test.beforeAll(async () => {
    test.skip(!(await isBackendReachable()), 'gateway at :5000 unreachable — skipping auth specs');
  });

  test.beforeEach(async ({ page }) => {
    // Pin to EN so error/UI copy assertions are stable.
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: LANG_KEY, value: 'en' },
    );
  });

  test('registers a new manager and lands on the tasks page', async ({ page }) => {
    const email = randomEmail('manager');
    const password = 'Password123!';

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillForm(email, password);

    const status = await registerPage.submitAndWaitForResponse();
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);

    await page.waitForURL('**/');
    await expect(page.locator('header.app-header')).toBeVisible();

    const stored = await page.evaluate((key) => window.localStorage.getItem(key), AUTH_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!) as { email: string; role: string; token: string };
    expect(parsed.email).toBe(email);
    expect(parsed.role).toBe('Manager');
    expect(parsed.token.length).toBeGreaterThan(10);
  });

  test('logs in an existing dev-seeded user and logs out again', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillCredentials(DEV_MANAGER.email, DEV_SEED_PASSWORD);

    const status = await loginPage.submitAndWaitForResponse();
    expect(status).toBe(200);

    await page.waitForURL('**/');
    const header = new AppHeader(page);
    await expect(header.emailLabel).toHaveText(DEV_MANAGER.email);

    await header.logout();
    await expect(page).toHaveURL(/\/login$/);

    const cleared = await page.evaluate((key) => window.localStorage.getItem(key), AUTH_KEY);
    expect(cleared).toBeNull();
  });

  test('rejects wrong password with an error message and stays on /login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillCredentials(DEV_MANAGER.email, 'definitely-not-the-password');
    const status = await loginPage.submitAndWaitForResponse();
    expect(status).toBeGreaterThanOrEqual(400);

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorText).toBeVisible();
  });

  test('rejects registration with an already-used email', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillForm(DEV_MANAGER.email, 'Password123!');
    const status = await registerPage.submitAndWaitForResponse();
    expect(status).toBeGreaterThanOrEqual(400);

    await expect(page).toHaveURL(/\/register$/);
    await expect(registerPage.errorText).toBeVisible();
  });

  test('ProtectedRoute redirects unauthenticated navigation back to /login', async ({ page }) => {
    await page.goto('/team');
    await expect(page).toHaveURL(/\/login$/);
  });
});
