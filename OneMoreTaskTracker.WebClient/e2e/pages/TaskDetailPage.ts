import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class TaskDetailPageObject {
  readonly page: Page;
  readonly heading: Locator;
  readonly nextStageButton: Locator;
  readonly stepperSteps: Locator;
  readonly activeStep: Locator;
  readonly confirmDialog: Locator;
  readonly confirmSubmit: Locator;
  readonly errorText: Locator;
  readonly backLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1.task-detail__heading');
    this.nextStageButton = page.locator('header.app-header button.primary-button');
    this.stepperSteps = page.locator('.state-stepper__step');
    this.activeStep = page.locator('.state-stepper__step--active .task-list__badge');
    this.confirmDialog = page.locator('[role="dialog"], .confirm-dialog');
    this.confirmSubmit = this.confirmDialog.locator('button', { hasText: /Перевести|Move|Confirm/ });
    this.errorText = page.locator('.error-text');
    this.backLink = page.locator('a.back-link');
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: 10_000 });
  }

  /** Click "next stage" → confirm → wait for move API response. */
  async advanceToNextStage(): Promise<number> {
    await this.nextStageButton.click();
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => /\/api\/tasks\/[^/]+\/move$/.test(r.url())),
      this.confirmSubmit.click(),
    ]);
    return response.status();
  }
}
