import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly errorText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button.primary-button.login-form__button');
    this.registerLink = page.getByRole('link', { name: /Зарегистрироваться|Register/ });
    this.errorText = page.locator('.error-text');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.submitButton).toBeVisible();
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async submitAndWaitForResponse(): Promise<number> {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/auth/login')),
      this.submitButton.click(),
    ]);
    return response.status();
  }

  async loginAs(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submitAndWaitForResponse();
  }
}
