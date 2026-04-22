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
    this.newFeatureButton = this.toolbar.getByRole('button', {
      // t('gantt:toolbar.newFeature') → "New feature" / "Новая фича". The
      // button is rendered with a leading "+ " glyph so we don't anchor the
      // start of the string.
      name: /new feature|новая фича/i,
    });
    // The toolbar title block renders `{t('gantt:subtitle')}` as an <h2>. On
    // top of that, the route component adds no dedicated <h1>, so we match
    // the toolbar heading which always contains "Plan" / "План" as the
    // eyebrow + subtitle text.
    this.heading = page.getByRole('heading', { name: /plan|план/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/plan');
    await expect(this.toolbar).toBeVisible();
  }

  // --- Create feature dialog ---------------------------------------------

  async openCreateFeatureDialog(): Promise<void> {
    await this.newFeatureButton.click();
    await expect(this.createFeatureDialog).toBeVisible();
  }

  /** Dialog shell rendered by `CreateFeatureDialog` → `Dialog` DS component. */
  get createFeatureDialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /create feature|создать фичу/i });
  }

  async fillCreateFeatureForm(values: {
    title: string;
    plannedStart: string;
    plannedEnd: string;
    description?: string;
  }): Promise<void> {
    const dialog = this.createFeatureDialog;
    // t('gantt:drawer.fields.title') → "Title" / "Название"
    await dialog.getByLabel(/^(?:title|название)$/i).fill(values.title);
    if (values.description !== undefined) {
      // t('gantt:drawer.fields.description') → "Description" / "Описание"
      await dialog.getByLabel(/^(?:description|описание)$/i).fill(values.description);
    }
    // t('gantt:drawer.fields.plannedStart/End')
    await dialog
      .getByLabel(/planned start|плановое начало/i)
      .fill(values.plannedStart);
    await dialog
      .getByLabel(/planned end|плановое окончание/i)
      .fill(values.plannedEnd);
  }

  async submitCreateFeature(): Promise<number> {
    const dialog = this.createFeatureDialog;
    // t('gantt:create.submit') → "Create" / "Создать". Anchor to end so we
    // don't match "Create feature" (the dialog heading text).
    const submit = dialog.getByRole('button', { name: /^(?:create|создать)$/i });
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().endsWith('/api/plan/features') && r.request().method() === 'POST',
      ),
      submit.click(),
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
