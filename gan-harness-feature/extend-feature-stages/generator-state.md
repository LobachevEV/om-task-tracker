# Frontend Generator State — Iteration 002

## Track
fullstack (FE side)

## Current Phase
B (Design fidelity / fix iteration)

## What Changed This Iteration

### UX-001-02 — Collapsed row gate visibility + per-track in-flight indicator
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGateChip/GanttGateChip.tsx`: added `testIdScope?: string` prop so the collapsed-row chips don't collide with the in-row chips when both are mounted; chip now renders the spec gate at all times and the prep gates at their per-track vertical offsets.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttFeatureRow/GanttFeatureRow.tsx`: collapsed lane now stacks two `gantt-row__track-summary` stripes (BE / FE), each carrying the track summary bar + the in-flight `GanttPhaseSegment` (when one phase is current) + the per-track prep-gate chip with `testIdScope="collapsed"`. The spec chip remains in the row's lane.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttFeatureRow/GanttFeatureRow.css`: lane min-height bumped to 56px; per-track stripe vertical positioning (`top: calc(50% - 12px)` for backend, +4px for frontend) and per-key prep-gate offsets so collapsed chips remain readable. Dimmed stripe opacity uses the existing `--track-dim-opacity` token (0.55 when waiting/rejected).

### UX-001-01 / FE-001-03 — Gate-reject inline reason editor
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGateChip/GanttGateChip.tsx`: replaced the cycling single button with a `<span role="group">` containing two distinct buttons (approve / reject) plus an inline reason editor. The reject button:
  - On a non-rejected gate, opens an inline single-line `<input>` (autoFocus) with Enter-submits / Escape-cancels keyboard support and a Submit button.
  - Validates the trimmed reason length 1..500. Empty / whitespace shows `gate-chip-spec-reason-error` and does NOT fire `onChangeStatus`.
  - On a rejected gate, fires `onChangeStatus(gateKey, 'waiting', null, version)` directly without opening the editor (re-open path).
  - Tracks pending state during the in-flight PATCH so double-clicks are eaten.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGateChip/GanttGateChip.css`: added classes for the new actions, reason editor, error label, and rejection-reason readout.

### UX-001-03 — Single-owner phase semantics
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttPhaseSegment/GanttPhaseSegment.tsx`: single-owner phases (`ethalon-testing`, `live-release`) now render as `<span role="img">` instead of a fake-button affordance; only multi-owner phases render `<button aria-expanded>`. `inFlightPhase` (added to `TrackBarGeometry`) is now consumed in the collapsed row.

### FE-001-04 / iter-2 conflict surface — `subStageOverlap` + `subStageCap`
- `OneMoreTaskTracker.WebClient/src/common/api/ApiError.ts`: extended `InlineEditConflictKind` to add `'subStageCap' | 'subStageOverlap'`; added optional `cap?: number`, `track?: string`, `phase?: string`, `neighborOrdinal?: number`.
- `OneMoreTaskTracker.WebClient/src/common/api/httpClient.ts`: `parseConflict` now accepts the extended kinds via `KNOWN_CONFLICT_KINDS` Set and reads `cap`, `track`, `phase`, `neighborOrdinal` off the conflict envelope.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/InlineEditors/InlineDateCell.tsx`: `resolveDateCellMessage` now branches on `subStageOverlap` (renders `Overlaps sub-stage #{neighborOrdinal+1}`) and `subStageCap` (renders `{phase} is at the {cap}-sub-stage cap`).
- `OneMoreTaskTracker.WebClient/src/common/i18n/locales/{en,ru}/gantt.json`: added `inlineEdit.errors.subStageOverlap` and `inlineEdit.errors.subStageCap` keys + the gate-chip aria/label keys (`approveAria`, `unapproveAria`, `rejectAria`, `unrejectAria`, `reasonAria`, `reasonPlaceholder`, `reasonSubmit`, `reasonCancel`, `rejectReasonRequired`, `rejectReasonTooLong`, `rejectFailed`, `inFlightAria`).

### FE-001-01 — Test coverage repair
- Deleted dead placeholder tests (every `expect(true).toBe(true)` tombstone): `tests/common/api/patchFeatureStage.test.ts`, `tests/pages/Gantt/{useStagePlanForm,useGanttLayout}.test.ts`, `tests/pages/Gantt/components/{StagePlanRow,StagePerformerCombobox,StagePlanTable,GanttSegmentedBar,GanttStageSubRow}/`, `tests/pages/Gantt/GanttPage.test.tsx`.
- Replaced `tests/pages/Gantt/ganttStageGeometry.test.ts` with 11 behavioral tests over the v2 taxonomy fixtures (`SOLO_FEATURE`, `MINI_TEAM_FEATURE`, `UNSCHEDULED_FEATURE`, `OVERDUE_FEATURE`, `SHIPPED_FEATURE`): gate count + track count + canonical phase order, `specBlocked`, `dimmed`, `inFlightPhase`, `plannedSubStageCount`, `featureHasAnyPlannedDate`, `featureIsOverdue`.
- New `tests/pages/Gantt/components/GanttGateChip/GanttGateChip.test.tsx` (13 tests): render + status data attr + aria-label + testIdScope namespacing; approve cycle (waiting then approved, approved then waiting); reject editor (does NOT fire on click; empty/whitespace blocks; trimmed-reason fires `(gateKey, 'rejected', trimmed, version)`; Enter submits; Escape cancels); re-open from rejected; readonly hides actions. **Critical FE-001-03 assertion: `onChangeStatus` is NEVER called with empty / whitespace `rejectionReason`.**
- New `tests/pages/Gantt/components/GanttPhaseSegment/GanttPhaseSegment.test.tsx` (12 tests): render-mode (`<span role="img">` for single-owner, `<button aria-expanded>` for multi-owner); hairline counts (0 for 1 sub-stage, 1 for 2, 5 for 6); ghost variant when bar is null; data-status / data-dimmed / data-overdue / data-multi-owner / data-expanded mirroring; click wiring (`onToggleExpand` only on multi-owner).
- New `tests/pages/Gantt/components/AddSubStageButton/AddSubStageButton.test.tsx` (4 tests): enabled fires `onAppend`; at-cap disables; cap value surfaced in the title tooltip; default label as title when not at cap.
- New `tests/pages/Gantt/components/GanttSubStageRow/GanttSubStageRow.test.tsx` (6 tests): read-only date rendering + owner display name resolution + `data-overdue`; remove-button gating (hidden when `total===1`, hidden when `canEdit=false`, fires `(subStageId, version)` when both pass).
- New `tests/pages/Gantt/components/GanttTrackRow/GanttTrackRow.test.tsx` (8 tests): header composition (prep gate chip + 4 phase segments); data-track / data-dimmed mirroring; cascade gating (no sub-stage rows when no phase expanded; only the expanded phase renders its rows); `AddSubStageButton` only on multi-owner phases when expanded + editable; gate change wires through `mutations.saveGateStatus`; phase click fires `onTogglePhase`.
- Replaced `tests/pages/Gantt/components/GanttFeatureRow/GanttFeatureRow.test.tsx` placeholder with 7 composition tests: collapsed-row composition (3 visible gate chips, per-track stripes, dimmed/non-dimmed) + caret toggle wiring + expand mounts the cascade.
- New `tests/pages/Gantt/useFeatureTaxonomy.test.ts` (4 tests): 3-gate / 2-track shape; `inFlightPhase` projection; memoization across re-renders with identical inputs; recomputes on feature ref change.

### Playwright recovery + happy-path E2E
- Root cause of iter-1 `PLAYWRIGHT_UNAVAILABLE` was a stale path import: `e2e/helpers/auth.ts` and `e2e/fixtures/devSeed.ts` imported from `../../src/shared/auth/...` but the source dir is `src/common/auth/...`. Patched both files. `npx playwright test --list` now resolves all 132 specs across 12 files.
- New `e2e/specs/gantt.gates-and-substages.spec.ts`: walks `/plan` → asserts the 3 collapsed-lane gate chips visible (UX-001-02) → expands → asserts both track rows mount → opens the spec reject editor → submits empty reason → asserts the inline error appears + `onChangeStatus` NOT fired (FE-001-03) → cancels (Escape) → approves the spec gate. Skips cleanly when (a) the gateway is unreachable, (b) `apiRegister` fails, or (c) the manager has no features in their plan (fresh-DB case). Smoke-validated on chromium against the running dev server: skips with `no features in plan` when the seed pipeline is incomplete.

## Feedback Items Addressed
- UX-001-01 (critical) — gate-reject empty-reason wire bug → fixed via inline editor + ≥1 char trimmed validation; never fires `onChangeStatus` with empty / whitespace.
- UX-001-02 (critical) — collapsed feature row hides BE-CS / FE-SR / per-track in-flight phase → fixed by mounting both prep-gate chips with `testIdScope="collapsed"` plus per-track summary stripes containing the in-flight `GanttPhaseSegment`.
- UX-001-03 (medium) — single-owner phases looked like buttons → single-owner now `<span role="img">`; multi-owner stays a button.
- FE-001-01 (critical) — test coverage regression → 13 placeholder/tombstoned files removed or replaced; +6 new behavioral test files (54 new tests); +real geometry test (11). `npm test` is now 51 files / 429 tests passing.
- FE-001-03 (critical) — gate-reject body contained `rejectionReason: ''` → fix above; explicit unit-test guard.
- FE-001-04 (medium) — `subStageOverlap` not surfaced in the FE → conflict envelope extended; InlineDateCell renders the localized `Overlaps sub-stage #{n}` message.

## Contract Snapshot
- api-contract.md version consumed: v2 (machine-readable: `gan-harness-feature/extend-feature-stages/contract-artifact/v2/openapi.json`)
- Generated client path: not generated — codebase has no codegen pipeline. Hand-typed against `openapi.json` per `feature-digest.md`. Conflict envelope follows the BE iter-2 spec (`{ error, conflict: { kind, currentVersion?, track?, phase?, cap?, neighborOrdinal? } }`).
- Regenerated this iteration: n/a (no codegen step exists)
- BE commit consumed: `04a014f` (iter-2 BE: SubStageOrderRule + subStageOverlap conflict variant)

## Digest Version Consumed
v2

## Disputed Feedback (rare)
None.

## Dev Server
- Command: `cd OneMoreTaskTracker.WebClient && npm run dev`
- URL: http://localhost:5173/plan
- Status: running (verified via `lsof -nPi tcp:5173` immediately before commit)
- Started at: 2026-04-30T14:00:00Z (carried over from iter-1)

## Waiting on BE (fullstack only)
Nothing blocking. BE iter-2 at `04a014f` emits the new `subStageOverlap` conflict variant which the FE now consumes.

## Known Gaps (carry forward)
- Storybook stories for the new gate-chip reason editor + collapsed-row stripes not yet written. Phase C polish.
- The new e2e spec `gantt.gates-and-substages.spec.ts` skips when the manager's plan is empty; once the harness wires a seed-one-feature hook into `before` (or once the BE's dev seeder ships features) the body will run end-to-end. Spec is structured so that flip is a one-line change.
- A11y / keyboard nav for the gate-chip reason editor + track expansion not yet exercised under Storybook a11y addon — Phase C polish.

## Run Output
- `npm run lint` — 0 errors, 3 warnings (only in `coverage/` artifacts, not source).
- `npx tsc -p tsconfig.json --noEmit` — 0 errors.
- `npm test` — 51 files, 429 tests passing.
- `npx playwright test --list` — 132 tests across 12 files (was 0 in iter-1 due to broken path imports).
- `npx playwright test e2e/specs/gantt.gates-and-substages.spec.ts --project=chromium` — 1 skipped (skip-on-empty-plan path; spec parses, launches chromium successfully, runs the seeding helper).
