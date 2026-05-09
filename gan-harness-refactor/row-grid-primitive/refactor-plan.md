# Refactor Plan — row-grid-primitive

Track: frontend
Baseline SHA: `f38bd791b8425970ea385f4496c9cfbd80151a51`
Planner-version: 1

## Goals

- Stand up a single shared row/grid primitive (`<Gutter>`) so the three
  Gantt left-panel row components stop re-implementing the gutter
  pattern (sticky positioning, overflow clip, min-block-size, named-line
  grid columns) ad hoc.
- Tokenise the row-height and viewport-breakpoint scales used across
  these three components so density and breakpoint changes are one-edit
  in `tokens.css` instead of three-edits in three CSS files.
- Make adding a *fourth* row variant (e.g. a hypothetical
  `TrackSubFeatureRow`) a render-site concern (`<Gutter columns={…}
  density="compact">`) rather than a CSS-authoring concern.

## Target axes (MUST-improve)

Every axis below has a baseline number measured at `BASELINE_SHA`, a
target the generator must hit, and a one-line source-of-truth command
the evaluator runs each iteration.

| # | Axis | Baseline (verified at SHA) | Target | Source-of-truth |
|---|------|----------------------------|--------|-----------------|
| 1 | Named-line inner `grid-template-columns` declarations in row CSS | 4 (1 base inner grid + 3 inner-grid `@media` overrides per row component — each uses bracket syntax `[code]`, `[label]` etc.) | **0 in row CSS files**; all named-line inner-grid declarations live in `Gutter.css` | `cd OneMoreTaskTracker.WebClient && grep -cE 'grid-template-columns:\s*\[' src/pages/Gantt/components/{GanttFeatureRow,GanttFeatureTrackBand,GanttTrackStageRow}/*.css \| awk -F: '{s+=$2} END {print s}'` → expects `0` (the outer `var(--gantt-gutter-width) 1fr` row-grid is MUST-NOT-touch, excluded by the `\[` filter) |
| 2 | Hard-coded `min-height` / `min-block-size` literal-px values in row CSS | 6 (`GanttFeatureRow.css:7=48px`, `:109=20px`; `GanttFeatureTrackBand.css:9=24px`, `:18=24px`; `GanttTrackStageRow.css:4=36px`, `:36=36px`) | **0** literal-px declarations on the *gutter root selectors*; the `__lead` 20px sub-row keeps its literal (it is a flex child gauge, not a row-height token consumer). All gutter-root row-height declarations consume `var(--row-h-{compact,default,feature})` | `cd OneMoreTaskTracker.WebClient && grep -nE 'min-(height\|block-size):[[:space:]]*[0-9]+px' src/pages/Gantt/components/{GanttFeatureRow,GanttFeatureTrackBand,GanttTrackStageRow}/*.css \| grep -vE '__lead\|gantt-row__lead'` → expects empty output |
| 3 | Literal viewport pixel values in row `@media` queries WITHOUT a token-marker comment | 3 `@media (max-width: …)` queries, all in `GanttTrackStageRow.css` (lines 54=1439, 82=1100, 96=1023), zero with marker comments | Every `@media (max-width: …)` line is followed (or preceded inline) by a `/* --bp-{md\|lg\|xl\|lg-narrow} */` marker tying the literal to a token. The `1100px` anomaly resolves as a 4th token `--bp-lg-narrow: 1100px` in `tokens.css` (see §"Breakpoint anomaly" below) | `cd OneMoreTaskTracker.WebClient && grep -nE '@media \(max-width' src/pages/Gantt/components/{GanttFeatureRow,GanttFeatureTrackBand,GanttTrackStageRow}/*.css src/pages/Gantt/components/GanttGutter/*.css \| grep -vE -- '--bp-(md\|lg\|xl\|lg-narrow)'` → expects empty output |
| 4 | `<Gutter>` API self-sufficiency for a 4th row variant | 0 (does not exist) | A 4th hypothetical row variant ("`TrackSubFeatureRow`") is rendered via `<Gutter columns={…} density="compact">` *without modifying* `Gutter.tsx` or `Gutter.css`. Exemplar lives at `gan-harness-refactor/row-grid-primitive/evidence/iter-NNN/axis-4-exemplar.tsx` (≤ 50 lines, type-checks against the published Gutter prop types) | `cd OneMoreTaskTracker.WebClient && npx tsc --noEmit ../gan-harness-refactor/row-grid-primitive/evidence/iter-NNN/axis-4-exemplar.tsx` → exits 0 AND the exemplar file imports `<Gutter>` (verified by `grep -q "from '.*GanttGutter'" axis-4-exemplar.tsx`) |

The rubric weighs these axes — see `refactor-eval-rubric.md`.

### Final values (verified at $GEN_COMMIT=ba5a8e0, evaluated 2026-05-09)

| # | Axis | Final | Verdict |
|---|------|-------|---------|
| 1 | Named-line `grid-template-columns:\s*\[` in row CSS | **0** (across all three row CSS files) | **MET** |
| 2 | `min-(height\|block-size): Npx` in row CSS, excl. `__lead` | **2 surviving** (`GanttFeatureRow.css:102 __lead 20px` exception; `GanttTrackStageRow.css:4 .gantt-track-stage-row outer 36px` — pre-existing, non-gutter-root). All gutter-root selectors in `Gutter.css` resolve through `var(--row-h-{compact,default,feature})`. | **PARTIAL** (gutter roots clean; non-gutter-root literals tracked under RF-003-02) |
| 3 | `@media (max-width:` lines without `/* --bp-* */` marker | **0** (`Gutter.css` 3/3 marked: `--bp-xl`, `--bp-lg-narrow`, `--bp-md`; surviving `GanttTrackStageRow.css` `@media` rules also marked) | **MET** |
| 4 | Type-checking exemplar uses `<Gutter>` for a 4th variant without modifying `Gutter.{tsx,css}` | **1** at `evidence/iter-003/axis-4-exemplar.tsx`, 16 LOC, imports from `.../GanttGutter`, typechecks under project tsconfig flags | **MET** |

### Optional 5th axis (decision: NOT included this run)

The brief flags container queries as encouraged but not mandatory. The
planner judges container queries are NOT worth the migration cost in
this harness for two reasons:

1. The viewport-cascade is part of the captured behavior contract;
   moving from `@media` to `@container` would change the *trigger* (the
   gutter container's inline-size, not the viewport's inline-size) and
   the harness would need a wider visual-snapshot envelope to absorb
   the resulting subpixel differences in test viewports where the
   gutter happens to straddle a breakpoint. The captured cascade-via-
   computed-style evaluator surface assumes viewport queries.
2. `--gantt-gutter-width` is itself viewport-driven (320 → 480 @1440).
   A `@container` rule on `<Gutter>` would observe the *container* (the
   row), which sizes from `--gantt-gutter-width`. The container size is
   the viewport's only via the `--gantt-gutter-width` step at 1440;
   between 1024 and 1439 the gutter is fixed at 320 px and the
   container query would only fire at the 1440 step. That is exactly
   what `@media (min-width: 1440px)` already buys, with no migration.

A future `/gan-refactor` may revisit if the gutter ever stops being
viewport-coupled. Out-of-scope here.

## MUST-NOT-touch

Hard boundary. Edits to these files / surfaces are auto-fail
regardless of test status. The behavior-contract surfaces in
`behavior-contract.json` mechanise most of these as byte-exact diffs.

- Every `data-testid` attribute name rendered or forwarded by the
  three row components AND their inline-edit children
  (`InlineOwnerPicker`, `InlineTextCell`, `InlineDateCell`,
  `InlineDateCalendar`, `InlineCellChevron`).
- Every `aria-*` attribute name on the three rows or their inline-edit
  children.
- Every `t('...')` translation key consumed by the three rows
  (`tracks.*`, `inlineEdit.*`, `row.*`).
- Host feature's API contract:
  `gan-harness-feature/feature-tracks-gantt/api-contract.md`.
- The 35 `overflow: hidden` rules across the gutter chain. The rule
  MUST stay on the gutter root (whether that root is `<Gutter>` or
  each component's outer wrapper). Popover layer (already portaled)
  continues to escape this clip via `createPortal`.
- `--gantt-gutter-width: 320px` and `--gantt-gutter-width: 480px`
  (`@media (min-width: 1440px)`) at `GanttPage.css`. Changing the
  gutter width also changes the timeline horizontal space — out of
  scope.
- The vitest 626/626 baseline. The captured manifest at
  `baseline-tests.json` (99 test files / 626 assertions) MUST stay
  green.
- The four binding e2e specs byte-equivalent at the test-assertion
  level (hashes in `behavior-contract.json` →
  `binding_e2e_specs_hash`):
  - `OneMoreTaskTracker.WebClient/e2e/specs/gantt-picker-popover-visible.spec.ts`
  - `OneMoreTaskTracker.WebClient/e2e/specs/gantt-left-panel-bugs.spec.ts`
  - `OneMoreTaskTracker.WebClient/e2e/specs/plan.happy-path.spec.ts`
  - `OneMoreTaskTracker.WebClient/e2e/specs/task-lifecycle.spec.ts`
- The `Popover` primitive at
  `OneMoreTaskTracker.WebClient/src/common/ds/Popover/` — recently
  landed; out of scope.
- Public component API (exported names + `*Props` types) of the three
  row components. Their internal CSS classnames may change (the
  evaluator reads computed style, not class lists), but their props
  surface MUST stay byte-exact (`row_component_props_interfaces`
  surface).

## Behavior preservation envelope

References `behavior-contract.md` + `behavior-contract.json` (13
captured surfaces, all `tolerance: exact`). Pinned tolerances and
overrides:

- **Visual snapshot pixel-diff tolerance**: not used as a hard gate.
  The visual-shape preservation is asserted by computed-style equality
  on a fixed list of selectors at viewports `{1024, 1100, 1280, 1440,
  1600}` — see `behavior-contract.md` §"Sticky-gutter invariants" #5.
  A harness-only Playwright spec authored at iter-1 owns these
  assertions; the binding e2e specs are unchanged.
- **`feature_row_min_height_invariant` is a tolerated-drift surface**.
  The diff WILL show changed pixel literals (48→56 on feature, 24→28
  on track-band, 36→36 on track-stage). The evaluator accepts the diff
  iff (a) each new value resolves through `var(--row-h-{compact,
  default, feature})` and (b) the token in `tokens.css` resolves to
  the value documented under §"Density tokens". This is the ONLY
  surface allowed to drift; all 12 others are byte-exact gates.
- **Bundle envelope**: total `OneMoreTaskTracker.WebClient/dist`
  gzipped size MUST NOT grow by more than 1 KiB. Source-of-truth:
  `cd OneMoreTaskTracker.WebClient && npm run build` then
  `du -bh dist/assets/*.css dist/assets/*.js | sort -rh | head`. The
  CSS reduction from de-duplicating `grid-template-columns` should
  more than cover the JS cost of rendering `<Gutter>` (a thin
  layout-component wrapper).
- **No BE perf envelope, no migration parity** — frontend-only.

## Scope boundary

In scope:
- `OneMoreTaskTracker.WebClient/src/common/styles/tokens.css`
  — new tokens only (additive). Existing tokens stay.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGutter/`
  — new directory holding `Gutter.tsx`, `Gutter.css`, `index.ts`. The
  brief's argument for local-to-Gantt placement (gantt vocabulary;
  the `src/common/ds/` primitives are gantt-agnostic) holds; this is
  not a DS primitive.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttFeatureRow/{GanttFeatureRow.tsx,GanttFeatureRow.css}`
  — consumes `<Gutter density="feature">`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttFeatureTrackBand/{GanttFeatureTrackBand.tsx,GanttFeatureTrackBand.css}`
  — consumes `<Gutter density="compact">`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttTrackStageRow/{GanttTrackStageRow.tsx,GanttTrackStageRow.css}`
  — consumes `<Gutter density="default">`. The 4-step breakpoint
  cascade for the `[dates]` column moves into `Gutter.css`, *keyed by
  density* (`Gutter[data-density="default"]` selectors carry the
  cascade).
- A new vitest test file at
  `OneMoreTaskTracker.WebClient/tests/pages/Gantt/components/GanttGutter/Gutter.test.tsx`
  covering: density mapping → min-block-size, columns mapping →
  grid-template-columns CSS variable, sticky/overflow invariants,
  className passthrough.

Out of scope (pinned for follow-up `/gan-refactor` runs):
- DS layout primitives in `src/common/ds/Layout/` (do not exist; not
  creating them here — `<Gutter>` is gantt-local on purpose).
- `GanttDateHeader` / `gantt-page__header-flank--leading` sticky
  flank — also a gutter, but not one of the three row components in
  scope.
- Container queries (see §"Optional 5th axis").
- Cleanup of orphan `tracks.row.inheritedOwnerSuffix` translation key
  carried over from `gantt-left-panel-tidy/RF-006-01`.
- Gutter width tokenisation (`--gantt-gutter-width`) — gutter width
  changes timeline geometry; deserves its own harness.

## Density tokens

Added to `tokens.css` (additive — existing tokens untouched):

```css
--row-h-compact: 28px;   /* track-band rows; intra-stage sub-rows */
--row-h-default: 36px;   /* track-stage rows; default working surface */
--row-h-feature: 56px;   /* feature row; 2× compact for hierarchy */
--row-h-nav:     48px;   /* page chrome / app shell */
```

Component → density mapping:

| Component | Density | Resolves to | Today's literal | Drift |
|-----------|---------|-------------|-----------------|-------|
| `GanttFeatureRow` (gutter root `.gantt-row__gutter` + `.gantt-row` outer) | `feature` | 56px | 48px | +8px (intentional, density-scale alignment) |
| `GanttFeatureTrackBand` (gutter root `.gantt-track-band__gutter` + header outer) | `compact` | 28px | 24px | +4px (intentional, density-scale alignment) |
| `GanttTrackStageRow` (gutter root `.gantt-track-stage-row__gutter` + outer) | `default` | 36px | 36px | 0 |
| `--row-h-nav` | (page chrome) | 48px | n/a in row scope | unused this iter — registered for future page-chrome callers |

## Breakpoint tokens

Added to `tokens.css`:

```css
--bp-md:        1024px;
--bp-lg:        1280px;
--bp-xl:        1440px;
--bp-lg-narrow: 1100px;  /* gantt-track-stage-row anomaly; see plan §"Breakpoint anomaly" */
```

Custom-media-query syntax (`@custom-media`) is non-standard CSS today,
so the breakpoint tokens are **documentation, not consumption**. Each
`@media (max-width: …)` clause keeps its literal pixel value but earns
a token-marker comment that ties it back. Examples authored verbatim
in the iteration:

```css
@media (max-width: 1023px) /* --bp-md */ { … }
@media (max-width: 1100px) /* --bp-lg-narrow */ { … }
@media (max-width: 1279px) /* --bp-lg */ { … }
@media (max-width: 1439px) /* --bp-xl */ { … }
```

### Breakpoint anomaly — `1100px`

The brief flags the existing `@media (max-width: 1100px)` rule (drops
the stage-code chip) as an anomaly: it does not match `--bp-md`,
`--bp-lg`, or `--bp-xl`. Three resolutions were considered:

1. Drop `1100px` and consolidate to `1024 + 1280 + 1440`. Rejected:
   the visual cascade IS part of the behavior contract; the
   `gantt-left-panel-tidy` revert proved the user reads the cascade
   as load-bearing.
2. Move `1100px` to `1024px` (extend the no-code-chip regime
   downward). Rejected: same reason.
3. Codify `--bp-lg-narrow: 1100px` as a fourth breakpoint token
   alongside `--bp-{md, lg, xl}`. **Selected.** It is the only option
   that preserves the cascade verbatim AND completes the token cover.

The token name `--bp-lg-narrow` reads "the narrow end of the
1024–1280 (`md`–`lg`) regime" — descriptive, not arbitrary.

### `1280px` vs `1279px` boundary

A second small reconciliation: the brief shows the 4-step cascade as
{`1024`, `1100`, `1280`, `1440`} (max-widths), but today's CSS
authors them as {`1023`, `1100`, `1439`, (no 1280)}. The "missing"
1280 step is because the existing CSS uses ONE rule at `max-width:
1439px` to handle the entire 1024–1439 regime (with 1100 as a
sub-step inside). The planner does NOT add a new `1279/1280` rule;
the brief was loose on this and the existing 3-step cascade is the
behavior contract. The tokens (`--bp-lg = 1280px`) remain
authored-but-unused on row-grid CSS — fine, they are also for the
optional 5th axis IF a future harness migrates to container queries.

## `<Gutter>` primitive — final API

Path: `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGutter/{Gutter.tsx,Gutter.css,index.ts}`.

```ts
export type GutterColumn = 'code' | 'label' | 'owner' | 'dates';

export type GutterDensity = 'compact' | 'default' | 'feature' | 'nav';

export interface GutterProps {
  /** Ordered column keys; drives the inner grid-template-columns. */
  columns: GutterColumn[];
  /** Density step; one of the --row-h-* tokens. Default 'default'. */
  density?: GutterDensity;
  /** Children: per-column content. Children assign themselves to a
   *  column via grid-column: code | label | owner | dates. */
  children: ReactNode;
  /** Forwarded to the root for spec targetability + CSS hooks. */
  className?: string;
  /** Forwarded test id. The three row components pass their existing
   *  testid through here; <Gutter> never invents one. */
  'data-testid'?: string;
}
```

Implementation contract:

- The `<Gutter>` root carries `data-density={density}` so CSS can key
  off `[data-density="…"]`. The 4-step viewport cascade for the
  `[dates]` column lives under
  `.gantt-gutter[data-density="default"] @media (max-width: …)`.
- The `<Gutter>` root carries `data-columns={columns.join('-')}` so
  CSS can key off `[data-columns~="dates"]`-style attribute selectors
  for column-presence rules.
- The token-driven column widths live as CSS variables inside
  `Gutter.css` (e.g. `--gutter-col-code: 28px`,
  `--gutter-col-label: 120px`, `--gutter-col-dates: 180px`), with
  breakpoint overrides applied via `@media` rules in `Gutter.css`
  using literal pixel values + `/* --bp-* */` markers.
- The root selector owns:
  - `position: sticky; inset-inline-start: 0;`
  - `min-inline-size` / `max-inline-size` from
    `var(--gantt-gutter-width)`
  - `border-inline-end: 1px solid var(--border)`
  - `overflow: hidden`
  - `min-block-size: var(--row-h-{density})`
  - `grid-template-columns` with named lines computed from
    `[data-columns~="…"]` matchers per density.
- The component renders ONE element (`<div>`) with the listed
  declarative attributes; it does NOT mutate or wrap children.

### 4-row exemplar (axis 4 evidence)

`evidence/iter-NNN/axis-4-exemplar.tsx`:

```tsx
import { Gutter } from 'src/pages/Gantt/components/GanttGutter';
export function TrackSubFeatureRow() {
  return (
    <Gutter columns={['code', 'label', 'owner']} density="compact"
            data-testid="track-sub-feature-row-demo">
      <span style={{ gridColumn: 'code' }}>SUB</span>
      <span style={{ gridColumn: 'label' }}>Sub-feature</span>
      <span style={{ gridColumn: 'owner' }}>—</span>
    </Gutter>
  );
}
```

The exemplar must type-check against the Gutter prop types and not
edit `Gutter.{tsx,css}`. The harness verifies via `tsc --noEmit` on
the exemplar file plus a grep for `from '.*GanttGutter'`.

## Planned commits

Rough sequence the generator should follow. Each commit ends green
(`npm run lint && npx tsc -b --noEmit && npx vitest run`). The
generator may split a commit further or merge two adjacent commits,
but should NOT reorder past a commit that changes a "public" boundary
(commits 2, 3, and the final exemplar commit).

1. `iter-1` — Add density and breakpoint tokens to `tokens.css`
   (additive; no consumer change yet). Add the harness-only Playwright
   spec that asserts the cascade-via-computed-style invariant at the
   five viewports against unchanged production CSS (locks the
   invariant in before any refactor).
2. `iter-2` — Land `<Gutter>` primitive + its `Gutter.css` + a
   dedicated vitest. No consumer migrated yet. Public boundary: the
   primitive's exported types.
3. `iter-3` — Migrate `GanttFeatureRow` to consume `<Gutter
   density="feature">`. Drop `grid-template-columns` and
   `min-height: 48px` from `GanttFeatureRow.css`; the literal becomes
   `var(--row-h-feature)` resolved by Gutter.css.
4. `iter-4` — Migrate `GanttFeatureTrackBand` to
   `<Gutter density="compact">`. Same pattern.
5. `iter-5` — Migrate `GanttTrackStageRow` to
   `<Gutter density="default" columns={…}>`. Move the 4-step cascade
   for `[dates]` into `Gutter.css` keyed by
   `[data-density="default"]`. Verify cascade-via-computed-style
   invariant at all five viewports.
6. `iter-6` — Add `/* --bp-* */` markers on each `@media` line that
   survives in `Gutter.css` (axis 3 closure). Drop the redundant
   inner-grid documentation comments from `GanttTrackStageRow.css`
   (their content moves into `Gutter.css`).
7. `iter-7` — Author `evidence/iter-NNN/axis-4-exemplar.tsx`. Verify
   it type-checks. (This iteration may merge with iter-6 if budget
   allows.)

## Feature-specific addenda

- **Lessons inherited from `gantt-left-panel-tidy`** (the reverted
  PASS at 9.41/10): the harness rubric is a *proxy* for UX, not a
  substitute. The user reverted aggressive rhythm-collapse on the
  same components. The takeaway baked into THIS plan: tokenise *the
  values that exist* (with the brief's deliberate 48→56 / 24→28
  density-scale alignment) — do NOT collapse them onto a smaller
  scale, do NOT widen the gutter, do NOT drop or merge breakpoint
  steps in the cascade. The 4-step cascade is part of the behavior
  contract and is captured.
- **Carry-over from `gantt-left-panel-tidy/RF-006-01`** (orphan
  `tracks.row.inheritedOwnerSuffix` key) is NOT touched here. Its
  surviving `display:none` span continues to satisfy
  `frozen_i18n_keys_rows`. Cleanly retiring it would require a
  planner-amended contract; out of scope.
- **`__lead 20px` exception in axis 2**: `GanttFeatureRow.css:109`
  (`.gantt-row__lead { min-block-size: 20px }`) is excluded from axis
  2. The 20px is a flex-child *gauge* inside the gutter (the lead
  row's own minimum); not a row-height token consumer. Promoting it
  to a token would require a `--row-h-mini` token whose only
  consumer is this single rule — pure ceremony. The axis-2
  source-of-truth grep filters it out via `grep -vE
  '__lead\|gantt-row__lead'`.
