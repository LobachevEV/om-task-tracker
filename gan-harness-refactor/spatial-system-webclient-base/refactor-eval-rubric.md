# Refactor Eval Rubric — spatial-system-webclient-base

Track: frontend

Canonical weights live in `GAN-FEATURE-SHARED.md` §"Scoring rubrics" →
`### Refactor`. Do not duplicate weights here. The orchestrator inlines
that sub-section when this rubric is consumed.

Behavior preservation is a **gate**, not a weighted score: drift in the
captured behavior contract forces auto-fail regardless of the weighted
total. See `GAN-FEATURE-SHARED.md` §"Refactor auto-fail triggers".

## Criterion meanings (source-of-truth pointers)

- `code_quality_delta` — readability, coupling, duplication, dead code,
  dependency removal, file-size targets. Source of truth: the
  MUST-improve axes table in `refactor-plan.md`. Each axis must move
  toward its target; regression on any axis caps this score at 4. The
  six axes for this refactor are token-coverage growth,
  ad-hoc-spatial-literal reduction, spatial primitive reuse, common-DS
  placement, design-system docs presence, and harness Playwright
  cascade green. **Ad-hoc-literal grep note (updated iter-2):** the
  source-of-truth find command in `refactor-plan.md` excludes
  `src/common/ds/spatial/` in addition to `src/common/styles/` and
  `src/pages/Gantt/`. Gutter.css hosts geometry constants that are
  intentionally numeric (row heights, column widths, breakpoints
  defined upstream as tokens) — including them as "ad-hoc literals"
  was a methodology gap introduced when Gutter.css was relocated from
  `pages/Gantt/`. The effective denominator at iter-1 is 60
  (unchanged from baseline once the spatial DS path is excluded).
- `integration_and_conventions` — follows existing patterns; no new
  utilities duplicating existing ones; lint clean (`npm run lint` from
  `OneMoreTaskTracker.WebClient`); no new `TODO/FIXME` introduced;
  imports stay within established module boundaries (e.g. no new
  `import` from `pages/<other-page>/...` cross-page hops; non-Gantt
  consumers reach `<Gutter>` only via `@/common/ds`); CSS files keep
  their existing per-component scoping.
- `test_coverage_delta` — coverage on touched files MUST be ≥ baseline
  (drop > 2% is auto-fail per SHARED §"Refactor auto-fail triggers").
  New tests for previously untested branches earn points. The captured
  vitest top-level test count is 63; an iteration that drops below 63
  without adding new tests for new behavior auto-fails the
  vitest-count surface diff.
- `perf_envelope` — N/A for this refactor (token-rename + component
  relocation cannot regress runtime perf in a way existing tooling
  detects). The evaluator may report a soft signal if the build's
  total `dist/` byte size grows by > 1% versus baseline, but does not
  gate on it. Set `perf_envelope` weight in the SHARED rubric to its
  default; treat the score as "no regression" by default and dock
  only on a documented bundle-size regression.

## Behavior-preservation gate (PRESERVED VERBATIM)

Diff baseline `behavior-contract.json` against re-captured contract
from the iteration's HEAD:

- Frontend: component-API diff (props/types/exports), visual snapshot
  diff (pixel tolerance per `refactor-plan.md`), interaction trace
  diff.
- Backend: public API surface diff (openapi/sdl/types), persisted-data
  schema diff, endpoint behavior matrix diff.
- Fullstack: both.

Any non-empty diff (after applying planner-pinned tolerances) → emit
`BEHAVIOR_DRIFT=true` → auto-fail.

## Feature-specific addenda

### Captured surfaces (from `behavior-capture.json`)

| Surface | Kind | Tolerance | Why captured |
|---------|------|-----------|--------------|
| `component_api_ds_barrel` | text | exact | `src/common/ds/index.ts` is the public entry-point clients import from. Adds with new symbols are fine; removals or signature changes are auto-fail. |
| `component_api_gutter_primitive` | text | exact | `<Gutter>` is the spatial primitive being promoted; its `GutterProps`, `GutterColumn`, `GutterDensity` exports are part of the public DS surface after promotion. |
| `component_api_popover_primitive` | text | exact | Already-promoted DS primitive consumed by Gantt and (eventually) by other pages. Drift here is auto-fail per the MUST-NOT-touch list. |
| `tokens_export_set` | text | exact | The set of `--*` custom properties in `tokens.css`. Adds are allowed via the surface itself (the `grep` captures the post-add set, so the contract files itself reflects the post-iteration state); the GATE is that no token is REMOVED or RENAMED. The evaluator implements that as: every line in the baseline must appear in the iteration's capture. (See evaluator note below.) |
| `data_testid_set` | text | exact | Adds are fine; removals or renames break Playwright fixture pages and break this gate. |
| `i18n_key_set` | json | exact | Translation surface stability. Adds fine; removals/renames break the contract. |
| `route_table` | text | exact | Public route paths in `App.tsx`. The refactor must not change routing. |
| `vitest_top_level_count` | json | exact | Anchors against accidental test-file deletion. New test files raise the count; the contract must be re-pinned by the orchestrator if the count grows from new tests in an iteration. |

### Evaluator note — additive-set semantics for token / testid / i18n surfaces

`exact` tolerance under `_capture-config.mjs` is a byte-equality check
on the captured stdout. For three surfaces — `tokens_export_set`,
`data_testid_set`, and `i18n_key_set` — the planner intent is
"baseline ⊆ iteration", not "baseline == iteration": the refactor MAY
add new tokens, testids, or translation keys, but MUST NOT remove or
rename existing ones.

The refactor evaluator's `score-must-improve-axes.mjs` /
`diff-behavior-contract.mjs` pipeline implements the full byte-equality
check. The evaluator's prompt MUST treat a diff on these three
surfaces as follows:

- If every baseline line is still present in the iteration capture and
  the only diff is added lines → **NOT a behavior drift** (additive
  set), report as `behavior_contract_additive` and pass the gate.
- If any baseline line is missing or rewritten → **behavior drift,
  auto-fail.**

This semantic is encoded in the rubric's prose (here) rather than in
the JSON tolerance kind because adding a fourth tolerance kind would
require teaching the harness scripts about it. Until the harness gains
an `additive_set` tolerance kind, the evaluator must apply the rule by
inspection.

### Soft signals (reported, not gated)

- `dist/` byte total before vs. after `npm run build`. Reported as a
  delta percentage. Gate trips only if growth > 1%.
- Lint warning count (`npm run lint` warnings only, not errors).
  Errors are already gated by `integration_and_conventions`.

### Auto-fail triggers specific to this refactor

In addition to SHARED §"Refactor auto-fail triggers":

- Any edit to a file in the MUST-NOT-touch list of `refactor-plan.md`.
- Any removal/rename of a token, testid, route, i18n key, or DS-barrel
  export (per the additive-set semantics above).
- Any introduction of a new `import` statement under `src/common/`
  reaching into `src/pages/`. The dependency direction is one-way:
  pages may import from common; common must NOT import from pages.
  This is the architectural inversion that promoting `<Gutter>` is
  meant to enable.
