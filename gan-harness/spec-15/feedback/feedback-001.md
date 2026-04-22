# Spec 15 — Evaluator Feedback 001

Eval mode: `code-only` (no live stack). Rubric: 0.15 D + 0.15 O + 0.20 C + 0.50 F, threshold 7.0.

## Dimension scores

| Dim | Weight | Score | Weighted |
|---|---|---|---|
| Design        | 0.15 | 9.0 | 1.350 |
| Originality   | 0.15 | 9.5 | 1.425 |
| Craft         | 0.20 | 9.0 | 1.800 |
| Functionality | 0.50 | 9.5 | 4.750 |
| **Total**     |      |     | **9.325** |

**Verdict: PASS** (9.33 ≥ 7.0).

## Rubric checks F1..F11

| # | Gate | Result | Evidence |
|---|------|--------|----------|
| F1  | `tsc -b --noEmit` | ✅ | Exit 0, no output (see tail below). |
| F2  | `playwright test --list` — new tests listed, ≥60 total | ✅ | "Total: 60 tests in 5 files"; plan.happy-path.spec.ts:15 + :72 listed for chromium/firefox/webkit. |
| F3  | `npm test -- --run` at 281/281 | ✅ | "Test Files 34 passed (34) / Tests 281 passed (281)". |
| F4  | `plan.happy-path` spec file exists | ✅ | `OneMoreTaskTracker.WebClient/e2e/specs/plan.happy-path.spec.ts`. |
| F5  | Skip guard via `isBackendReachable` | ✅ | spec line 3 imports, line 10 uses inside `beforeAll`. |
| F6  | `role="dialog"` / `getByRole('dialog')` present | ✅ | PlanPage.ts:60 (create dialog via `getByRole('dialog').filter(...)`), PlanPage.ts:121 (drawer via `aside.feature-drawer[role="dialog"]`). Spec pulls drawer through POM getters. |
| F7  | `Date.now()` in plan.ts | ✅ | fixtures/plan.ts:33 (email), :108 (jiraId). |
| F8  | `aria-pressed` assertion | ✅ | PlanPage.ts:154 inside `expectZoomActive`; used in happy-path `await plan.expectZoomActive('month')`. |
| F9  | Drawer vs create-dialog genuinely distinct | ✅ | `createFeatureDialog` = `page.getByRole('dialog').filter({ hasText: /create feature\|создать фичу/i })`; `featureDrawer` = `page.locator('aside.feature-drawer[role="dialog"]')` — class-scoped CSS selector guarantees they can't collide. Source `FeatureDrawer.tsx:211` confirms `<aside className="feature-drawer" role="dialog">`. |
| F10 | Drawer auto-opens after create | ✅ | `GanttPage.tsx:125-132`: `handleCreated(id)` calls `setCreateOpen(false)` then `state.openFeature(id)`; wired at line 217 via `onCreated={(feature) => handleCreated(feature.id)}`. Spec's "drawer visible after create" assertion is well-founded. |
| F11 | Negative-path test | ✅ | spec line 72: `test('developer cannot edit features', ...)`. |

## Tail snippets

### `tsc -b --noEmit` (clean)
```
(no output, exit 0)
```

### `playwright test --list | tail` (truncated)
```
[webkit] › specs/plan.happy-path.spec.ts:15:3 › @integration plan happy path › manager creates and fills a feature, then sees it on the Plan
[webkit] › specs/plan.happy-path.spec.ts:72:3 › @integration plan happy path › developer cannot edit features
[webkit] › specs/team-roster.spec.ts:21:3 › team roster › renders AppHeader tabs clickable from /team
...
Total: 60 tests in 5 files
```

### `npm test -- --run`
```
Test Files  34 passed (34)
     Tests  281 passed (281)
  Start at  16:52:17
  Duration  2.58s
```

## Deviations from spec 15 literal copy

1. **Auth method:** Fixture seeds auth into `localStorage` (`seedAuthInLocalStorage`) instead of driving the `/login` form in the spec. This is faster and mirrors `authed.ts`, but diverges from spec §61-65's "Login via form" step. Acceptable — login UI is already covered by `auth.spec.ts`.
2. **Developer fallback:** Non-manager account reuses `alice.frontend@example.com` from `devSeed.ts` because `/api/auth/register` hardcodes Manager role server-side. Documented in the fixture docblock; requires `ASPNETCORE_ENVIRONMENT=Development`. Correctly called out as a deferral.
3. **Zoom assertion:** Spec §95-96 expects a single `z` press to land on month, but the default state is `twoWeeks` and `ZOOM_ORDER` cycles `week → twoWeeks → month → week`. Implementation presses `z` twice (line 67-69) — the **generator fixed a spec bug**, which is the correct call, but note the deviation.
4. **Placeholder feature title:** Seeded as `"Setup"` (matches spec §42 narration). Fixture correctly creates the task under it so the happy-path step 5 exercises reassign-on-attach.

## Top 5 issues

1. **Drawer heading race (minor, flaky risk).** Line 48 asserts `drawer.getByRole('heading', { name: uniqueTitle }).toBeVisible()` — the drawer mounts immediately with placeholder heading `t('drawer.title')` ("Feature"/"Фича") and only shows `data.feature.title` after `useFeatureDrawerData` fetches. Playwright's auto-wait will handle this, but if the GET hangs the test times out with a confusing "heading not visible" error instead of a clearer network timeout. Consider `expect(drawer).toContainText(uniqueTitle)` or awaiting the response explicitly.
2. **`onRetry()` fire-and-forget in `handleCreated`.** Cosmetic: after create, `GanttPage` re-fetches features and the new row appears in the lanes. Spec §92 asserts "row visible after drawer close" — generator omitted this step. Not a functional gap but a spec coverage shortfall. Current close-then-zoom flow skips the re-list assertion.
3. **`fillCreateFeatureForm` label regex is unanchored.** `/planned start|плановое начало/i` is fine because `plannedEnd` doesn't share "start"/"начало". However, `/attach task|прикрепить задачу/i` at POM line 134 could match button text if a future button is labelled "Attach task" — cheap hardening: anchor to `^…$` (acceptable as-is because `getByLabel` targets `<label for=...>` bindings).
4. **No explicit `role: 'FrontendDeveloper'` verification round-trip.** The developer fixture trusts the JWT payload's role, but the POM's negative-path test relies on `GanttToolbar` omitting the "New feature" button for non-managers — exactly what the source does (line 148-152). Safe, but an explicit `expect(plan.toolbar).not.toContainText('New feature')` would be a belt-and-suspenders assertion.
5. **Constructor signature style mismatch.** Rubric hinted `constructor(readonly page: Page)`; PlanPage uses `constructor(page: Page) { this.page = page; ... }`. Functionally equivalent and matches existing `TasksPage` / `TeamPage` style, so this is a taste deviation, not a defect.

## Acknowledged deferrals (not penalized)

- Developer seed falls back to dev-seeded `alice.frontend@example.com` (spec §34 implies register; backend only registers Managers).
- No CI wiring (spec §124 defers).
- No teardown (spec §131-132 allows ephemeral DB + unique IDs).
- `test.skip` on 502/503 mirrors `task-lifecycle.spec.ts` — graceful when downstream gRPC is down.

## Verdict

**PASS — 9.33 / 10.** All 11 gates green, TypeScript clean, 281 unit tests unchanged, 6 new test cases across 3 browsers (60 total, was 54). POM disambiguation is solid; drawer auto-open wiring verified against `GanttPage.tsx`. Ship it.
