import type { Locator, Page } from '@playwright/test';

export class AppHeader {
  readonly page: Page;
  readonly header: Locator;
  readonly tasksTab: Locator;
  readonly teamTab: Locator;
  readonly logoutButton: Locator;
  readonly langRu: Locator;
  readonly langEn: Locator;
  readonly emailLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header.app-header');
    this.tasksTab = this.header.locator('a.app-header__nav-item', { hasText: /Задачи|Tasks/ });
    this.teamTab = this.header.locator('a.app-header__nav-item', { hasText: /Команда|Team/ });
    this.logoutButton = this.header.getByRole('button', { name: /Выйти|Log out/ });
    this.langRu = this.header.getByRole('button', { name: 'RU' });
    this.langEn = this.header.getByRole('button', { name: 'EN' });
    this.emailLabel = this.header.locator('.app-header__email');
  }

  async switchLanguage(lang: 'ru' | 'en'): Promise<void> {
    const btn = lang === 'ru' ? this.langRu : this.langEn;
    await btn.click();
  }

  async goToTeam(): Promise<void> {
    await this.teamTab.click();
    await this.page.waitForURL('**/team');
  }

  async goToTasks(): Promise<void> {
    await this.tasksTab.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }
}
