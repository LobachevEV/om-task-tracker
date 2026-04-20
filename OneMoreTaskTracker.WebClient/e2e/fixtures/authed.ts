import { test as base, type Page } from '@playwright/test';
import {
  apiLogin,
  seedAuthInLocalStorage,
  setLanguageInLocalStorage,
  type AuthResponseBody,
} from '../helpers/auth';
import { DEV_MANAGER, DEV_SEED_PASSWORD } from './devSeed';

interface AuthedFixtures {
  auth: AuthResponseBody;
  managerPage: Page;
}

export const test = base.extend<AuthedFixtures>({
  auth: async ({ request }, use) => {
    const auth = await apiLogin(request, {
      email: DEV_MANAGER.email,
      password: DEV_SEED_PASSWORD,
    });
    await use(auth);
  },
  managerPage: async ({ page, auth }, use) => {
    await setLanguageInLocalStorage(page, 'en');
    await seedAuthInLocalStorage(page, auth);
    await use(page);
  },
});

export { expect } from '@playwright/test';
