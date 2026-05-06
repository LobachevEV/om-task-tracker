# Frontend Generator State — Iteration 005

## Track
fullstack (FE side)

## Current Phase
B (Design fidelity / fix iteration)

## What Changed This Iteration

### UX-004-01 — Two-step confirm-remove pattern
- `GanttSubStageRow`: first click on remove button enters `pendingConfirm` state (button label changes to a confirm cue); second click commits the remove. Prevents accidental deletion.
- New `data-confirm-pending` attribute mirrors the state for styling.

### UX-004-02 — Sticky gutter for track-row and sub-stage-row
- `.gantt-track-row__gutter` and `.gantt-substage-row__gutter` now have `position: sticky; left: 0; z-index: 2` so row labels stay visible during horizontal scroll.

### UX-004-03 — Stagger gate chips horizontally
- Spec gate chip is always at `leftPx=0`. Prep-gate chips stagger: backend at `leftPx=32`, frontend at `leftPx=64` so chips never overlap when the scroll position is at zero.

### UX-004-04 — Gate chip aria-label/tooltip with approver+date
- Gate chip `<button>` receives `aria-label` and `title` combining gate key, status, approver display name, and approval date when present.
- i18n keys added: `gates.ariaLabel`, `gates.approvedBy`.

### UX-004-05 — Aria-live announcements on mutations
- `GanttPage` mounts a visually-hidden `role="status"` `aria-live="polite"` region.
- `onAnnounce` callback threaded down through `GanttFeatureRow` → `GanttTrackRow` → `GanttSubStageRow`.
- Mutations (gate status change, owner save, date save) fire `onAnnounce` with a human-readable i18n string on success.

### UX-004-06 — Replace two-button gate flip with listbox pattern
- `GanttGateChipActions` replaced the old two-button (`onApprove`/`onReject`) API with a single toggle button that opens a `role="listbox"` popover.
- Toggle: `data-testid="${base}-toggle"`, `aria-expanded`, `aria-haspopup="listbox"`.
- Options: `data-testid="${base}-option-{approved|waiting|rejected}"`.
- Keyboard: Escape closes, ArrowDown/ArrowUp cycle options, Enter selects.
- Rejection reason editor opens inline when `rejected` is selected from the listbox.

### UX-004-07 — Fix upstream-rejection dim cascade
- `ganttStageGeometry.ts`: track `dimmed` flag now fires when EITHER the track's own prep-gate is not approved OR the spec gate is not approved (was only checking the track's own prep-gate).
- Result: a waiting/rejected spec gate dims all tracks, not just the directly-blocked one.

### UX-004-08 — Focus new owner cell after AddSubStage
- `appendedSubStageIdRef` threaded from `GanttTrackRow` → `GanttSubStageRow` → `GanttSubStageRowGutter`.
- `GanttSubStageRowGutter` has a `useEffect` that fires when the owner combobox mounts: if `appendedSubStageIdRef.current === subStage.id`, it focuses the owner input and clears the ref.
- Extracted `PhaseCascade` child component in `GanttTrackRow` to satisfy `react-hooks/refs` lint rule (passing a ref as prop inside render is allowed in child component scope).

### UX-004-10 / FE-004-02 — Role-aware empty-state copy
- `GanttEmpty` receives `isManager: boolean` prop.
- Manager sees action-oriented copy ("Create the first feature to get started"); viewer sees informational copy ("No features are planned yet").
- i18n keys: `empty.titleManager`, `empty.subtitleManager`, `empty.titleViewer`, `empty.subtitleViewer`.

### Test fixes (12 previously failing tests)
- `GanttGateChip.test.tsx`: full rewrite to match listbox API — uses `${base}-toggle` and `${base}-option-{status}` test IDs. Added 10 new tests covering listbox behavior (aria-expanded, 3 options, close-on-select, Escape, ArrowDown navigation). Total: 23 tests (was 13).
- `GanttSubStageRow.test.tsx`: fixed "shows Remove when total > 1" — now sends two clicks (pending-confirm then commit).
- `GanttTrackRow.test.tsx`: fixed "approving the prep gate calls saveGateStatus" — now opens listbox then clicks option-approved.

### New dim-cascade tests
- `ganttStageGeometry.test.ts`: added `describe('computeFeatureGeometry — dim cascade (UX-004-07)')` with 4 tests:
  1. spec=rejected → all tracks dimmed
  2. spec=waiting → all tracks dimmed
  3. SOLO_FEATURE (all approved) → no tracks dimmed
  4. MINI_TEAM_FEATURE (spec=approved, fe-prep=waiting) → only FE track dimmed

### Lint fix
- Extracted `PhaseCascade` inner component in `GanttTrackRow.tsx` to resolve `react-hooks/refs` ESLint error (rule flags ref usage inside inline render callbacks).

## Feedback Items Addressed
- UX-004-01: two-step confirm-remove
- UX-004-02: sticky gutters
- UX-004-03: gate chip stagger
- UX-004-04: gate chip aria-label+tooltip
- UX-004-05: aria-live announcements
- UX-004-06: listbox gate-flip (replacing two-button pattern)
- UX-004-07: dim cascade from spec gate rejection
- UX-004-08: auto-focus owner cell after append
- UX-004-10 / FE-004-02: role-aware empty-state copy

## Contract Snapshot
- api-contract.md version consumed: v2 (machine-readable: `gan-harness-feature/extend-feature-stages/contract-artifact/v2/openapi.json`)
- Generated client path: not generated — codebase has no codegen pipeline. Hand-typed against `openapi.json` per `feature-digest.md`.
- Regenerated this iteration: n/a (no codegen step exists)
- BE commit consumed: `00ed1ae` (iter-5 BE)

## Digest Version Consumed
v1 (no bump this iteration)

## Disputed Feedback
None blocking.

## Dev Server
- Command: `cd OneMoreTaskTracker.WebClient && npm run dev`
- URL: http://localhost:5174/plan
- Status: running (port 5174 — 5173 occupied by prior process)

## Waiting on BE (fullstack only)
Nothing blocking. BE iter-5 at `00ed1ae` is fully consumed.

## Known Gaps (carry forward)
- Storybook stories not yet written (Phase C).
- `scripts/gan-feature/scan-hard-bans.mjs` does not exist in this repo (carry-forward operational gap, harness-side). Manual grep performed instead — 0 violations.

## Run Output
- `npm run lint` — 0 errors, 3 warnings (only in `coverage/` artifacts, not source).
- `npm run build` (`tsc -b && vite build`) — 0 errors.
- `npm test` (`vitest run`) — 70 test files, 515 tests passing.
- Dev server: running on http://localhost:5174/plan.
