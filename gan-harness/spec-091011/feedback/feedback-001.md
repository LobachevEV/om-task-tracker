# GAN feedback — specs 09 + 10 + 11 (Gantt primitives + feature row + drawer)

Eval mode: code-only.

## Dimension scores

| Dimension | Weight | Score | Weighted |
|-----------|-------:|------:|---------:|
| Design         | 0.15 | 8 | 1.20 |
| Originality    | 0.15 | 9 | 1.35 |
| Craft          | 0.20 | 4 | 0.80 |
| Functionality  | 0.50 | 9 | 4.50 |
| **Total**      |      |   | **7.85** |

**Verdict: PASS** (threshold 7.0).

Craft is capped at 4 by the "missing focus trap" rubric cap — see F-issue #1.

---

## Functional gates

| Gate | Result |
|------|--------|
| F1 `tsc -b --noEmit` | green (empty output) |
| F2 `npm run build` | green (`built in 663ms`, 231 modules) |
| F3 `npm test -- --run` | **253 / 253 pass** (31 files) |
| F4 `npm run build-storybook` | green (`Storybook build completed successfully`) |
| F5 `new Date(` / `Date.now(` in `features/gantt/` | only two legitimate uses, both in `ganttMath.ts` (`new Date(ts)` with explicit argument inside `parseIsoDate` / `addDays`). Zero in stories. |
| F6 `role="dialog"` in `FeatureDrawer.tsx` | present at line 214, plus `aria-modal="true"` and `aria-labelledby` |
| F7 `updateFeature` / `attachTask` / `detachTask` wired | each ≥ 1 (drawer handlers + test/story mocks) |
| F8 Storybook files with `Meta<` | 4: `GanttTimeline`, `GanttAssigneeStack`, `GanttFeatureRow`, `FeatureDrawer` |
| F9 Sparse PATCH in `FeatureEditForm` | ✅ `buildPatch(initial, current)` diffs each of `title`, `description`, `state`, `plannedStart`, `plannedEnd` and emits only changed keys; Save disabled when `Object.keys(patch).length === 0`. Drawer test asserts `updateFeature` called with exactly `{ title: 'New shiny title' }`. |
| F10 `useTranslation('gantt')` | every production component file has it: `FeatureDrawer`, `FeatureEditForm`, `GanttFeatureRow`, `GanttAssigneeStack`, `GanttTimeline` |

---

## Design (8 / 10)

Strengths:
- `useGanttLayout` returns the contract spec 09 asks for: `{ window, lanes, unscheduled, todayPercent }`, plus a stable `useMemo` identity (tested).
- `ganttMath.ts` is framework-free, pure, `yyyy-mm-dd` end-to-end; `barGeometry` correctly handles both-null, single-endpoint-collapses-to-point, degenerate end < start, and clamp flags.
- `GanttTimeline` renders date cells via CSS-grid `repeat(var(--day-count), 1fr)`, week-start highlight via class modifier, and the today hairline is an absolutely-positioned 1px element.
- `GanttFeatureRow` matches the structure: sticky left gutter (title button + lead line + `GanttAssigneeStack`), absolutely positioned bar styled via `--bar-left` / `--bar-width` inline custom properties, narrow-bar fallback (outside label), clamp carets, skeleton + revealed-task sub-bars with per-state class.
- `FeatureDrawer` has `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; ESC closes; initial focus moves to close button; `canEdit` gates Edit / Attach / Detach; sparse PATCH on `FeatureEditForm.onSubmit`.
- `useFeatureDrawerData` is the only place that calls `planApi.getFeature`; mutations stay in the drawer. Cancels in-flight requests via `AbortController`.

Caveats:
- The drawer re-implements its own modal chrome instead of composing the existing `src/shared/ds/Dialog` primitive. Spec 11 explicitly directed "use the existing DS `Dialog` primitive if it supports right-aligned placement; otherwise builds a minimal drawer on top of `Dialog`'s focus-trap / portal primitives". The trap would have come for free.
- `reassignOptions` is declared but never populated (deferred to spec 12 — accepted per the evaluator notes). The detach button is correctly disabled while `detachTarget === ''`.

## Originality (9 / 10)

- Stories pull `FIXTURE_TODAY` + `windowForZoom(FIXTURE_TODAY, zoom)`; zero `new Date()` in any `*.stories.tsx`.
- Colors flow from `FEATURE_STATE_CSS` (maps state → CSS token name) and CSS custom properties (`--state-*`); no hex or hard-coded rgb anywhere in `features/gantt/`.
- Assignee stack reuses DS `Avatar` + `Badge` (overflow chip is `Badge tone="neutral" dot={false}`). Task sub-bar colors come from existing `STATE_CLASS` taxonomy.
- Plain `.css` + BEM-style class names (`gantt-row__bar--overdue`, `feature-drawer__task-id`, …), matching the `team/` feature's convention rather than CSS modules.
- No new runtime dependencies.

Minor: `FeatureDrawer.css` includes `color-mix(... var(--danger) ...)` — `--danger` is assumed to exist in tokens.css; if it doesn't, the `--state-danger` fallback pattern from the spec is already used in `GanttFeatureRow.css` (`var(--state-danger, var(--danger))`) but not applied to the error banner. Cosmetic, not penalized.

## Craft (4 / 10 — capped)

Strengths:
- All component props are precisely typed (`BarGeometry`, `DateWindow`, `MiniTeamMember`, `FeatureDetail`, `UpdateFeaturePayload`); zero `any` and zero `as any`.
- Memoisation in `useGanttLayout` is verified by a referential-equality test. `GanttTimeline` memoises day-cell expansion. `GanttFeatureRow` memoises bar style + overdue calc.
- CSS uses design tokens throughout (`--surface`, `--text`, `--text-muted`, `--border`, `--border-strong`, `--accent`, `--font-mono`, `--state-*`, `--z-modal`, `--shadow-lg`).
- Storybook titles match spec: `Plan/Primitives/GanttTimeline`, `Plan/Primitives/GanttAssigneeStack`, `Plan/Primitives/GanttFeatureRow`, `Plan/Composed/FeatureDrawer`. 4/4.
- i18n: every production component uses `useTranslation('gantt')`; both en and ru have `drawer.title`, `drawer.close`, `drawer.edit`, `drawer.save`, `drawer.cancel`, `drawer.tasksHeading`, `drawer.attachTaskLabel`, `drawer.attachTaskSubmit`, `drawer.detach`, `drawer.detachConfirm`, `drawer.detachTarget`, `drawer.validation.titleRequired`, `row.lead/team/tasks/unscheduled/dueOverdue`, `meta.soloOwner`, `legend.today`.
- Accessibility basics: avatars get `title` / `name`; title button has a composed `aria-label`; task sub-bars have `role="button"` + `tabIndex={0}` + `aria-label`; drawer meta has semantic `h2` / `h3`; `aria-expanded` on the row title when reveal handler is present.

Cap trigger — **missing focus trap**:
- `FeatureDrawer` only moves initial focus to the close button (`useEffect` on mount). There is no Tab-cycling trap: Tab from the last actionable element inside the drawer escapes back into the underlying page. Spec 11 acceptance explicitly requires focus management matching the native `<dialog>.showModal()` behaviour, either by using the native element or a manual trap.
- This single miss triggers the rubric cap "missing focus trap / role dialog → Craft ≤ 4".

Other smaller craft issues (not additionally penalized beyond the cap):
- Drawer does not restore focus to the opener on close. Spec tab-order section implies a proper modal lifecycle.
- `GanttTimeline` root uses `role="presentation"` — fine, but the today hairline + label both have `aria-hidden`, leaving the `t('legend.today')` announcement only in the legend on `GanttPage`. Acceptable inside the timeline primitive.
- The drawer `Editing` / `EditingWithValidationError` stories drive the form via raw DOM (`canvasElement.ownerDocument.querySelector`). Functional, but `storybook/test` canvas queries would be more idiomatic. Cosmetic.

## Functionality (9 / 10)

All 10 gates pass. Test suite grew to 253 (≥ 253 threshold exactly). Both builds clean. The single deduction is for the axe-core acceptance criterion on the `Editing` story — cannot be verified in code-only mode, and focus-trap absence would likely fail it.

---

## Top issues (ranked)

1. **Focus trap missing in `FeatureDrawer`.** Add either `<dialog>` + `.showModal()` (which brings native focus trap, backdrop, ESC, and inert), or a small manual trap that wraps Tab / Shift+Tab between the first and last focusable descendant. Also restore focus to the opener on close. This single fix unblocks the Craft cap and the spec-11 axe acceptance.
2. **DS `Dialog` primitive not reused.** The codebase ships `src/shared/ds/Dialog/`, yet the drawer reimplements portal + overlay + close handling from scratch. Either compose `Dialog` (ideal) or extract the drawer's chrome into a `DrawerDialog` variant inside the DS. Pays off the Craft cap too.
3. **`reassignOptions` is hard-coded empty.** Accepted deferral to spec 12, but the select currently renders only `—`, so even a Manager with permission cannot detach. Document the temporary state in a `// TODO: populate from spec 12` comment next to the state line so the follow-up doesn't get lost.
4. **Drawer does not restore focus on close.** Capture `document.activeElement` on open, return focus there when `featureId` flips to null and the close animation completes.
5. **`FeatureDrawer.css` error banner uses `var(--danger)` without a fallback.** Spec 10's overdue underline used `var(--state-danger, var(--accent))` — mirror that safety net here so a theme missing `--danger` doesn't break the banner.
6. **Meta avatar + label composition** on the drawer meta row is inline-flex but the `<span>` wrapper around `Avatar` can read as a single announceable node to screen readers; consider swapping to a `<dl>` or labelling the avatar via `aria-hidden="true"` + visible text label for the lead name.

## Deferrals acknowledged (no penalty)

- `LeadPicker` subcomponent for `FeatureEditForm` deferred — form currently exposes title / description / state / dates only. Matches task note.
- Reassignment picker ships with empty options; detach disabled until a target is selected. Matches task note.

---

## Summary

Production code is solid, tests are comprehensive, and functional gates pass cleanly. The drawer's focus-management gap is the only rubric-capping issue; fixing it (ideally by composing the existing `shared/ds/Dialog` primitive) would raise Craft into the 8-9 band and push the weighted total toward 8.5+. Ship after addressing item 1.
