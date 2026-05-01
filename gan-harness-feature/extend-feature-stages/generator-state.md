# Frontend Generator State — Iteration 003

## Track
fullstack (FE side)

## Current Phase
B (Design fidelity / fix iteration)

## What Changed This Iteration

### FE-002-01 (CRITICAL, auto-fail) — `BarGeometryPx` test fixtures repaired
- `OneMoreTaskTracker.WebClient/tests/pages/Gantt/components/GanttPhaseSegment/GanttPhaseSegment.test.tsx`: 4 sites (`makeSubGeom` line 39; `makePhaseGeom` default `bar` line 59; ghost overrides at line 169 and line 231) now spread the full `BarGeometryPx` shape — added `clampedLeft: false, clampedRight: false`. The type is `{ leftPx; widthPx; clampedLeft: boolean; clampedRight: boolean }`, not numeric; verified against `src/pages/Gantt/ganttMath.ts:127-132`.
- `OneMoreTaskTracker.WebClient/tests/pages/Gantt/components/GanttSubStageRow/GanttSubStageRow.test.tsx`: 1 site (`makeGeom` line 48) likewise.
- `npm run build` (which is `tsc -b && vite build`) now exits 0 — CI canonical command verified, not just `tsc -p tsconfig.json --noEmit`.

### Gateway-level "Pick a teammate from the list" surfaced inline (BE iter-3 commit ec382d2)
- The pre-existing inline-error pipeline already covers this: `httpClient.handleResponse` parses the gateway's `{ error: <string>, conflict: ... }` envelope into `ApiError(400, "Request failed (400): Pick a teammate from the list", null)`; `toInlineEditorError` (in `InlineEditorError.ts`) maps `status === 400` → `kind: 'validation'`; `InlineCellError` (rendered inside `InlineOwnerPicker`) renders the message inline as `role="alert"` `data-kind="validation"`. The trim-prefix `Request failed (400):` is stripped client-side, so the user sees only "Pick a teammate from the list".
- New regression test `tests/pages/Gantt/components/InlineEditors/InlineOwnerPicker.test.tsx` "renders gateway 400 ... inline next to the picker": throws `ApiError(400, ...)` from `onSave`, asserts `role=alert` + `data-kind=validation` + visible "Pick a teammate from the list" + `aria-invalid=true` on the combobox input.

### UX-002-INFO-{01,02,03} — GanttGateChip reject editor a11y polish
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGateChip/GanttGateChip.tsx`:
  - `aria-describedby` on the reason `<input>` now points at the cap hint span and the live counter span (both rendered alongside the input). Hint span ID `${testIdBase}-reason-hint`; counter span ID `${testIdBase}-reason-counter`.
  - New `<span data-testid="…-reason-counter" aria-live="polite">` shows `n / 500` and updates on every keystroke. Tabular-nums for stable width.
  - The displayed reason readout (rendered when the gate is `rejected` and the editor is closed) carries `role="status"` so AT announces it when the value changes.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGateChip/GanttGateChip.css`: added `.gantt-gate-chip__reason-hint` and `.gantt-gate-chip__reason-counter` (muted micro-text, tabular numerals on the counter).
- `OneMoreTaskTracker.WebClient/src/common/i18n/locales/{en,ru}/gantt.json`: new keys `gates.reasonHint` ("Up to {{max}} characters" / "До {{max}} символов") and `gates.reasonCounter` ("{{n}} / {{max}}").
- 3 new tests in `tests/pages/Gantt/components/GanttGateChip/GanttGateChip.test.tsx` ("a11y polish" describe block): aria-describedby wiring, counter updates as typing happens, role=status on the closed-editor readout.

## Feedback Items Addressed
- FE-002-01 (critical, auto-fail) — `BarGeometryPx` test fixtures missing `clampedLeft, clampedRight` → 5 sites in 2 files patched. `npm run build` exits 0.
- BE-001-02 / iter-3 BE (gateway "Pick a teammate from the list") — surfaced inline via the existing 400-error pipeline; added a regression test that locks the inline-render contract.
- UX-002-INFO-01 — `aria-describedby` on the reason input → cap-hint span.
- UX-002-INFO-02 — `n / 500` character counter (live region).
- UX-002-INFO-03 — `role="status"` on the closed-editor rejection-reason readout.

## Contract Snapshot
- api-contract.md version consumed: v2 (machine-readable: `gan-harness-feature/extend-feature-stages/contract-artifact/v2/openapi.json`)
- Generated client path: not generated — codebase has no codegen pipeline. Hand-typed against `openapi.json` per `feature-digest.md`.
- Regenerated this iteration: n/a (no codegen step exists)
- BE commit consumed: `ec382d2` (iter-3 BE: gateway-layer owner-roster check, 400 `{ error: "Pick a teammate from the list" }` on PATCH/POST sub-stage owner)

## Digest Version Consumed
v1 (no bump this iteration)

## Disputed Feedback (rare)
None blocking.

The prompt described `clampedLeft, clampedRight` as numeric (`leftPx, leftPx + widthPx`); the actual type at `src/pages/Gantt/ganttMath.ts:127-132` is `boolean`. Used `false, false` consistent with the production factory's "fully-inside" path.

The prompt referenced a "textarea" in the reject editor; the component uses a single-line `<input type="text">`. The polish (aria-describedby, n/500 counter, role=status on the readout) was applied unchanged — input vs textarea is irrelevant to the three a11y attachments.

## Dev Server
- Command: `cd OneMoreTaskTracker.WebClient && npm run dev`
- URL: http://localhost:5173/plan
- Status: running (verified via `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/plan` → 200 immediately before commit)
- Started at: 2026-04-30T14:00:00Z (carried over from iter-1)

## Waiting on BE (fullstack only)
Nothing blocking. BE iter-3 at `ec382d2` adds the `400 { error: "Pick a teammate from the list" }` envelope on invalid `ownerUserId`; FE consumes via the unchanged `ApiError` → `toInlineEditorError` pipeline.

## Known Gaps (carry forward)
- Storybook stories for the gate-chip reason editor + collapsed-row stripes not yet written. Phase C polish.
- E2E spec `gantt.gates-and-substages.spec.ts` still skips on empty-plan / compose-skew (FE-002-02). Operational, addressed-to-orchestrator.
- `scripts/gan-feature/scan-hard-bans.mjs` does not exist in this repo (carry-forward operational gap, harness-side).

## Run Output
- `npm run lint` — 0 errors, 3 warnings (only in `coverage/` artifacts, not source).
- `npm run build` (canonical CI: `tsc -b && vite build`) — 0 errors. **Verified before commit, replaces the iter-2 `tsc -p tsconfig.json --noEmit` mistake.**
- `npm test` — 51 files, 433 tests passing (was 429; +4 new: 1 InlineOwnerPicker + 3 GanttGateChip a11y polish).
- Dev server: `curl /plan` → 200.
