import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AppHeader } from './AppHeader';

export type ZoomKey = 'week' | 'twoWeeks' | 'month';

const ZOOM_LABEL: Record<ZoomKey, RegExp> = {
  // en: "Week" / ru: "Неделя"
  week: /^(?:Week|Неделя)$/i,
  // en: "2 weeks" / ru: "2 недели"
  twoWeeks: /^2\s?(?:weeks|недели)$/i,
  // en: "Month" / ru: "Месяц"
  month: /^(?:Month|Месяц)$/i,
};

/**
 * Page Object for /plan (GanttPage). Mirrors the shape of TasksPage.ts —
 * role-based locators backed by regex so the spec stays locale-agnostic
 * (en/ru both supported, matching the i18n.spec.ts convention).
 */
export class PlanPage {
  readonly page: Page;
  readonly header: AppHeader;
  readonly toolbar: Locator;
  readonly newFeatureButton: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = new AppHeader(page);
    this.toolbar = page.getByRole('toolbar');
    // The "+ New feature" affordance is now an inline ghost button rendered
    // by `AddFeatureRow` at the head of the lanes list (and inside the
    // empty-state when there are no features yet). Manager-only — for
    // non-managers it is not rendered at all.
    this.newFeatureButton = page.getByRole('button', {
      name: /new feature|новая фича/i,
    });
    this.heading = page.getByRole('heading', { name: /plan|план/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/plan');
    await expect(this.toolbar).toBeVisible();
  }

  // --- Inline create flow (AddFeatureRow) --------------------------------

  /** The inline form shell shown after activating the ghost button. */
  get createFeatureForm(): Locator {
    return this.page.locator('.add-feature-row__form');
  }

  /** Activates the inline ghost button so the title input is focused. */
  async openCreateFeatureDialog(): Promise<void> {
    await this.newFeatureButton.first().click();
    await expect(this.createFeatureForm).toBeVisible();
  }

  /**
   * Fills the inline title input. Description was dropped from the create
   * surface; it can be added via the existing inline editors after the row
   * appears, so the `description` argument is ignored.
   */
  async fillCreateFeatureForm(values: {
    title: string;
    description?: string;
  }): Promise<void> {
    const input = this.createFeatureForm.getByLabel(/^(?:title|название)$/i);
    await input.fill(values.title);
    void values.description;
  }

  // --- Stage planning ----------------------------------------------------

  /** The 5-row planning table inside the feature drawer's edit view. */
  get stagePlanTable(): Locator {
    return this.featureDrawer.locator('.stage-plan__table');
  }

  /** Individual stage rows within the plan table (excluding the head row). */
  stagePlanRows(): Locator {
    return this.stagePlanTable.locator(
      '.stage-plan__row:not(.stage-plan__row--head)',
    );
  }

  /** Range-summary chip shown in the section header once all rows are filled. */
  get stagePlanRangeSummary(): Locator {
    return this.featureDrawer.getByTestId('stage-plan-range-summary');
  }

  /** Reassign link rendered in any stage row whose performer is stale. */
  get stagePerformerReassignLink(): Locator {
    return this.featureDrawer.getByRole('button', {
      name: /^(?:reassign|переназначить)$/i,
    });
  }

  async enterEditMode(): Promise<void> {
    await this.featureDrawer
      .getByRole('button', { name: /^(?:edit|изменить)$/i })
      .click();
  }

  async fillStagePlanRow(
    rowIndex: number,
    plannedStart: string,
    plannedEnd: string,
  ): Promise<void> {
    const row = this.stagePlanRows().nth(rowIndex);
    const dates = row.locator('input[type="date"]');
    await dates.nth(0).fill(plannedStart);
    await dates.nth(1).fill(plannedEnd);
  }

  /** Clicks Save and awaits the PATCH response status. */
  async submitFeatureEdit(): Promise<number> {
    const drawer = this.featureDrawer;
    // t('gantt:drawer.save') → "Save" / "Сохранить" — match exactly to
    // avoid the transitional "Saving…" / "Saved ✓" labels.
    const submit = drawer.getByRole('button', { name: /^(?:save|сохранить)$/i });
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          /\/api\/plan\/features\/\d+$/.test(r.url()) &&
          r.request().method() === 'PATCH',
      ),
      submit.click(),
    ]);
    return response.status();
  }

  async submitCreateFeature(): Promise<number> {
    const input = this.createFeatureForm.getByLabel(/^(?:title|название)$/i);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().endsWith('/api/plan/features') && r.request().method() === 'POST',
      ),
      input.press('Enter'),
    ]);
    return response.status();
  }

  // --- Feature rows / drawer ---------------------------------------------

  /**
   * Row gutter title button, rendered by `GanttFeatureRow` with
   * `aria-label` set to a composite of title + state + due text.
   */
  featureRowButton(title: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(escapeRegExp(title), 'i') });
  }

  async openFeatureRow(title: string): Promise<void> {
    await this.featureRowButton(title).first().click();
    await expect(this.featureDrawer).toBeVisible();
  }

  /**
   * The right-anchored `<aside role="dialog">` from `FeatureDrawer`. Filter
   * excludes the create dialog (which shares `role="dialog"`) by matching on
   * an `h2.feature-drawer__title` — every drawer renders one.
   */
  get featureDrawer(): Locator {
    return this.page.locator('aside.feature-drawer[role="dialog"]');
  }

  async closeFeatureDrawer(): Promise<void> {
    const drawer = this.featureDrawer;
    // t('gantt:drawer.close') → "Close" / "Закрыть"
    await drawer.getByRole('button', { name: /close|закрыть/i }).click();
  }

  async attachTaskToOpenFeature(jiraId: string): Promise<number> {
    const drawer = this.featureDrawer;
    // t('gantt:drawer.attachTaskLabel') → "Attach task (Jira ID)" / "Прикрепить задачу (Jira ID)"
    await drawer
      .getByLabel(/attach task|прикрепить задачу/i)
      .fill(jiraId);
    // t('gantt:drawer.attachTaskSubmit') → "Attach" / "Прикрепить"
    const submit = drawer.getByRole('button', { name: /^(?:attach|прикрепить)$/i });
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => /\/api\/plan\/features\/\d+\/tasks\//.test(r.url()) && r.request().method() === 'POST',
      ),
      submit.click(),
    ]);
    return response.status();
  }

  // --- Zoom --------------------------------------------------------------

  zoomButton(key: ZoomKey): Locator {
    return this.toolbar.getByRole('button', { name: ZOOM_LABEL[key] });
  }

  async expectZoomActive(key: ZoomKey): Promise<void> {
    await expect(this.zoomButton(key)).toHaveAttribute('aria-pressed', 'true');
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
