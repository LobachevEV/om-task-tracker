import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AppHeader } from './AppHeader';

export class TasksPageObject {
  readonly page: Page;
  readonly header: AppHeader;
  readonly newJiraInput: Locator;
  readonly createSubmit: Locator;
  readonly taskList: Locator;
  readonly taskRows: Locator;
  readonly filterSelect: Locator;
  readonly errorText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = new AppHeader(page);
    this.newJiraInput = page.locator('.task-form input.field__input');
    this.createSubmit = page.locator('.task-form button.primary-button');
    this.taskList = page.locator('ul.task-list');
    this.taskRows = page.locator('ul.task-list li.task-list__item');
    this.filterSelect = page.locator('select.field__input--compact');
    this.errorText = page.locator('.error-text');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.newJiraInput).toBeVisible();
  }

  async createTask(jiraId: string): Promise<number> {
    await this.newJiraInput.fill(jiraId);
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().endsWith('/api/tasks') && r.request().method() === 'POST'),
      this.createSubmit.click(),
    ]);
    return response.status();
  }

  rowByJiraId(jiraId: string): Locator {
    return this.taskRows.filter({ hasText: jiraId });
  }

  async openTask(jiraId: string): Promise<void> {
    await this.rowByJiraId(jiraId).locator('a.task-list__link').click();
    await this.page.waitForURL(new RegExp(`/tasks/${jiraId}$`));
  }
}
