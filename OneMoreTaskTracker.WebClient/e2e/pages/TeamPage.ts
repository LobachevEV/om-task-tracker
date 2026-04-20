import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AppHeader } from './AppHeader';

export class TeamPageObject {
  readonly page: Page;
  readonly header: AppHeader;
  readonly title: Locator;
  readonly rosterTable: Locator;
  readonly rosterRows: Locator;
  readonly searchInput: Locator;
  readonly loadError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = new AppHeader(page);
    this.title = page.locator('h1.team-toolbar__title');
    this.rosterTable = page.locator('.roster-table');
    this.rosterRows = this.rosterTable.locator('tbody tr');
    this.searchInput = page.locator('input.team-search-input');
    this.loadError = page.locator('.team-page__error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/team');
    await expect(this.title.or(this.loadError)).toBeVisible();
  }

  async waitForRoster(): Promise<void> {
    await expect(this.rosterTable).toBeVisible({ timeout: 10_000 });
  }

  rowByEmail(email: string): Locator {
    return this.rosterRows.filter({ hasText: email });
  }

  async memberCount(): Promise<number> {
    await this.waitForRoster();
    return this.rosterRows.count();
  }
}
