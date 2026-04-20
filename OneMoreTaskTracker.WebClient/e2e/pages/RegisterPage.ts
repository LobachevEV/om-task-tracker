import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.locator('input[autocomplete="new-password"]').first();
    this.confirmInput = page.locator('input[autocomplete="new-password"]').nth(1);
    this.submitButton = page.locator('button.primary-button.login-form__button');
    this.loginLink = page.getByRole('link', { name: /Войти|Sign in/ });
    this.errorText = page.locator('.error-text');
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
    await expect(this.submitButton).toBeVisible();
  }

  async fillForm(email: string, password: string, confirm?: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmInput.fill(confirm ?? password);
  }

  async submitAndWaitForResponse(): Promise<number> {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/auth/register')),
      this.submitButton.click(),
    ]);
    return response.status();
  }
}
