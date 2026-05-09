# Refactor Plan — spatial-system-webclient-base

Track: frontend
Baseline SHA: 4f3ee00a65a05aa43a08ad79f394f543b8ff346f
Planner-version: 1
Runners: `./runners.json`

## Brief

Expand the spatial system across the entire WebClient (not just the Gantt
page) so the spatial system becomes the base of the design system.

## Goals

- Make `src/common/styles/tokens.css` the single source of truth for
  spacing, row heights, breakpoints, and density across every page —
  not just `/plan`.
- Promote the spatial primitives currently scoped to the Gantt page
  (`<Gutter>` and the row-height / breakpoint tokens it consumes) into
  `src/common/ds/` so non-Gantt consumers can use them without reaching
  into a sibling page.
- Keep the visible UI behavior near-identical: tokens replace ad-hoc
  literals at the same numeric values; no layout drift, no copy churn,
  no testid churn.

## Target axes (MUST-improve)

Each axis has a baseline counted from `feature/feature-tracks-gantt @
4f3ee00`, a target, and a reproducible source-of-truth command. Run all
commands from `OneMoreTaskTracker/OneMoreTaskTracker.WebClient` unless
noted.

| Axis | Baseline | Target | Source-of-truth |
|------|----------|--------|-----------------|
| token-coverage growth: number of CSS files OUTSIDE `common/styles/` AND OUTSIDE `pages/Gantt/` that reference `var(--space-*)`, `var(--row-h-*)`, or `var(--bp-*)` | 1 | ≥ 5 | `grep -lE 'var\(--space\|var\(--row-h\|var\(--bp-' -r src --include='*.css' \| grep -v common/styles/ \| grep -v pages/Gantt/ \| wc -l` |
| ad-hoc-spatial-literal reduction: count of unique `px`/`rem` numeric literals declared in CSS files OUTSIDE `src/common/styles/` AND OUTSIDE `src/pages/Gantt/` AND OUTSIDE `src/common/ds/spatial/` | 60 | ≤ 45 (≥ 25% reduction) | `find src -name '*.css' -not -path 'src/common/styles/*' -not -path 'src/pages/Gantt/*' -not -path 'src/common/ds/spatial/*' \| xargs grep -ohE '\b[0-9]+(\.[0-9]+)?(px\|rem)\b' \| sort -u \| wc -l` |
| spatial primitive reuse: number of non-test, non-Gantt source files importing `Gutter` (or its successor under `common/ds`) | 0 | ≥ 1 | `grep -rE "from ['\"][^'\"]*\bGutter['\"]" src --include='*.tsx' --include='*.ts' \| grep -v 'pages/Gantt/' \| grep -v '\.test\.' \| wc -l` |
| common-DS placement: number of imports of `Gutter` from a path containing `pages/Gantt/components/GanttGutter` from outside the Gantt page | 0 | 0 (must remain 0; the primitive must NOT be exposed via its old in-Gantt path to non-Gantt callers) | `grep -rE "from ['\"][^'\"]*pages/Gantt/components/GanttGutter['\"]" src --include='*.tsx' --include='*.ts' \| grep -v 'pages/Gantt/' \| wc -l` |
| design-system docs: a markdown file enumerating the spatial scale, density tokens, and breakpoints | absent (no `docs/spatial-system.md` or `docs/DESIGN.md` in WebClient) | present, ≥ 60 non-blank lines, mentions `--space-*`, `--row-h-*`, `--bp-*` | `wc -l OneMoreTaskTracker.WebClient/docs/spatial-system.md` then `grep -E -- '--(space\|row-h\|bp)-' OneMoreTaskTracker.WebClient/docs/spatial-system.md \| wc -l` |
| no visual regression on the captured Playwright cascade harness | green at baseline (`e2e/specs/_harness/row-grid-cascade.spec.ts`) | green at HEAD when backend is reachable; otherwise spec is `test.skip`-ped per its existing guard | `cd OneMoreTaskTracker.WebClient && npx playwright test e2e/specs/_harness/row-grid-cascade.spec.ts --reporter=list` |

Notes:
- Counting a literal "outside Gantt" is the relevant signal — the Gantt
  page's geometry numbers (cell widths, ruler steps) are intentionally
  numeric and OUT OF SCOPE for this refactor. The metric explicitly
  excludes both `common/styles/` (where tokens live) and `pages/Gantt/`
  (where geometry is allowed to be numeric).
- Exact-byte regression on the first-five `tokens_export_set` /
  `route_table` / `data_testid_set` / `i18n_key_set` / DS-barrel /
  Gutter-API / Popover-API surfaces is gated by
  `behavior-contract.json` (see Behavior preservation envelope below);
  it is not a "MUST-improve" axis.

## MUST-NOT-touch

Hard boundary. Edits to these files / surfaces are auto-fail regardless
of test status.

- All backend services: `OneMoreTaskTracker.Users/`, `OneMoreTaskTracker.Tasks/`,
  `OneMoreTaskTracker.Features/`, `OneMoreTaskTracker.GitLab.Proxy/`,
  `OneMoreTaskTracker.Api/`, plus their `tests/*` siblings.
- Auth flow semantics: `OneMoreTaskTracker.WebClient/src/common/auth/**`
  (`AuthContext`, `ProtectedRoute`) — visual-only consumption is fine,
  but no behavioral changes.
- Gantt page internal logic — only spatial-token consumption may change:
  - `src/pages/Gantt/ganttMath.ts`
  - `src/pages/Gantt/ganttStageGeometry.ts`
  - `src/pages/Gantt/trackStageGeometry.ts`
  - `src/pages/Gantt/trackStageMeta.ts`
  - `src/pages/Gantt/selectStagesForKind.ts`
  - `src/pages/Gantt/stateConfig.ts`
  - `src/pages/Gantt/roleToSide.ts`
  - `src/pages/Gantt/useGanttPageState.ts`
  - `src/pages/Gantt/useGanttLayout.ts`
  - `src/pages/Gantt/useGanttTimelineScroll.ts`
  - `src/pages/Gantt/usePlanFeatures.ts`
  - `src/pages/Gantt/useStagePlanForm.ts`
  - `src/pages/Gantt/useTeamRoster.ts`
- All `data-testid="..."` literals anywhere under
  `OneMoreTaskTracker.WebClient/src/`. Adds are fine; renames and
  removals are not.
- All translation keys under
  `OneMoreTaskTracker.WebClient/src/common/i18n/locales/`. Adds are
  fine; renames, removals, or namespace moves are not.
- Public component APIs of existing `common/ds` primitives — `Popover`,
  `Avatar`, `Callout`, `Spinner`, `Button`, `Badge`, `Card`, `Dialog`,
  `Field`, `Kbd`, `StatusDot`, `IntegrationIcon`. Visual-only
  consumption is fine, prop additions with defaults are fine, but
  removals or breaking renames are not.
- `src/pages/Gantt/components/GanttGutter/Gutter.tsx`'s exported
  signature (`Gutter`, `GutterProps`, `GutterColumn`,
  `GutterDensity`) — the symbol may move (see open question), but the
  shape of `GutterProps` and the union literals of `GutterColumn` and
  `GutterDensity` MUST stay byte-identical.
- The `harness` Playwright spec
  `e2e/specs/_harness/row-grid-cascade.spec.ts`. Its assertions are the
  cascade contract.

## Behavior preservation envelope

References `behavior-contract.md` + `behavior-contract.json`. Default
exact-byte tolerance applies to every captured surface.

- DS-barrel public surface, Gutter primitive surface, Popover primitive
  surface, route table, tokens-export set, i18n keys set,
  data-testid set: **exact**. Any non-empty diff sets
  `BEHAVIOR_DRIFT=true` and forces auto-fail.
- Vitest top-level test count: **exact** at baseline (63). New tests
  are encouraged but the count check is exact-equality on the
  captured number to flag accidental test deletion. The generator may
  add a follow-up surface override only by re-pinning the contract via
  the orchestrator (not within an iteration).
- No bundle-size envelope this run — the refactor is token-renaming
  and primitive-promotion; it should not move bundle bytes
  meaningfully. (If `dist/` size grows by > 1% on the eval iteration
  build, the evaluator reports it as a soft signal but does not gate.)
- Visual snapshot tolerance: not applicable; visual snapshots aren't
  in the captured surface set because the project doesn't have a
  storybook-snapshot runner wired. The `row-grid-cascade.spec.ts`
  Playwright harness is the visual-equivalence proxy.
- BE perf envelope / migration parity: N/A (track=frontend).

## Scope boundary

In scope:

- Add new tokens (or expose existing tokens) needed to cover spacing /
  row heights / breakpoints in non-Gantt pages, when the existing
  `--space-*`, `--row-h-*`, `--bp-*` palette already has the right
  numeric value. New numeric values may be added under `common/styles/`
  if (and only if) they replace ≥ 2 ad-hoc literals.
- Migrate ad-hoc `px`/`rem` literals in:
  - `src/common/components/AppHeader/AppHeader.css` (15 unique values)
  - `src/common/styles/auth-pages.css` and login/register page CSS (13 unique)
  - `src/common/components/{ErrorBoundary,LanguageSwitcher,ShortcutLegend,Spinner}` CSS
  - `src/pages/Tasks/TaskPage.css` (22 unique) and `TaskDetailPage.css` (12 unique)
  - `src/pages/Team/TeamPage.css` (21 unique) and its `components/*` CSS
  - `src/common/ds/{Badge,Button,Callout,IntegrationIcon,Kbd,StatusDot}/*.css`
  to consume tokens.
- Promote `<Gutter>` from `src/pages/Gantt/components/GanttGutter` to
  `src/common/ds/spatial/Gutter` (see open question for "move
  outright" vs "re-export"), and add it to the `src/common/ds`
  barrel.
- Add at least one non-Gantt consumer of `<Gutter>` (recommended: the
  `AppHeader` row, the `Team` page roster row, or the `Tasks` page
  list row — whichever has the simplest existing two-column header).
- Author `OneMoreTaskTracker.WebClient/docs/spatial-system.md`
  documenting the spatial scale, row densities, breakpoint tokens, and
  the `<Gutter>` API.

Out of scope (pinned for follow-up `/gan-refactor` runs):

- Changing the numeric values of any token (e.g. moving `--space-3`
  from 12px to 14px). The current values are frozen.
- Migrating Gantt-internal numeric literals in `pages/Gantt/` that
  drive geometry/state — those are intentionally numeric.
- Introducing a CSS-in-JS layer or replacing CSS Modules / vanilla CSS
  with another styling tool. The refactor stays inside the existing
  CSS-files-per-component structure.
- Adding new spatial primitives beyond `<Gutter>` (e.g. `<Stack>`,
  `<Row>`, `<Container>`). Out of scope for this run; if the
  evaluator's signal shows a single-primitive ceiling on the
  ad-hoc-literal-reduction axis, a follow-up `/gan-refactor` run can
  add one new primitive at a time.
- Renaming any token. Token additions and additions to consumer files
  are the only allowed shape change to the token surface this run.
- Theme / dark-mode work, color-token additions, typography-scale
  changes.

## Planned commits

The generator may split or merge, but should not reorder past a commit
that changes a public boundary (commits 2 and 3 below).

1. **iter-1** — Doc-first: author `docs/spatial-system.md` enumerating
   the spatial scale, row densities, breakpoint tokens, and the
   `<Gutter>` API as it exists today. No production-code edits.
2. **iter-2** — Promote `<Gutter>` to `src/common/ds/spatial/Gutter`
   (move + re-export shim per the open-question recommendation). Add
   `Gutter`, `GutterProps`, `GutterColumn`, `GutterDensity` to the
   `src/common/ds/index.ts` barrel. Update the three existing in-Gantt
   imports to consume from the barrel. Verify the
   `row-grid-cascade.spec.ts` harness still passes (when backend
   reachable) and the Gutter component-API surface diff is empty.
3. **iter-3** — Migrate ad-hoc spatial literals to tokens, page by
   page, in priority order: AppHeader → auth-pages.css →
   TaskPage.css / TaskDetailPage.css → TeamPage.css and
   `Team/components/*` CSS → ds primitives' own CSS. Each commit
   covers ONE file or one tightly-coupled triple. Each commit must
   keep the unique-`px`-`rem`-outside-styles count monotonically
   non-increasing.
4. **iter-4** — Add the first non-Gantt `<Gutter>` consumer in
   AppHeader's two-column nav-row (or Team page header — whichever the
   generator finds the cleanest fit). Verify behavior-contract diff
   stays empty. Update `docs/spatial-system.md` with the worked
   example.
5. **iter-5** (only if the ad-hoc-literal axis still hasn't met its
   target after iter-3 + iter-4) — final ad-hoc-literal sweep on
   whichever file shows the highest residual unique-literal count.

## Feature-specific addenda

### Open question (orchestrator surfaces to user; do NOT block)

**Promotion strategy for `<Gutter>` — move outright or re-export shim?**

- *Recommendation: move + leave a thin re-export shim.* Move the
  primitive's source to `src/common/ds/spatial/Gutter/{Gutter.tsx,Gutter.css,index.ts}`
  and add a one-line shim at the original
  `src/pages/Gantt/components/GanttGutter/index.ts` that re-exports
  from the new location. The three existing in-Gantt imports get
  updated to consume from `@/common/ds` directly so the shim has zero
  intra-repo callers and can be deleted in a follow-up sweep. The
  shim exists only as insurance against a third-party fork or
  experimental branch hot-importing the old path.
- *Why not "straight move + git mv":* A `git mv` is fine for the
  source files, but the `import { Gutter } from '../GanttGutter'`
  statements in the three Gantt row components would all need to
  change in the same commit, which inflates the commit's blast radius
  and obscures the "the API didn't change" signal in code review. A
  shim keeps the move and the call-site rewrites in separate commits.

### Why no perf / bundle axis

The refactor renames consumers of CSS custom properties and moves a
~40-line React component. It cannot regress perf or bundle in a way
the existing tooling would detect. Adding a perf axis would be
unmeasurable noise.

### Why one MUST-improve axis is "≥ 1" not "≥ 3"

The "spatial primitive reuse" axis is intentionally low-bar (≥ 1 non-Gantt
consumer). The first non-Gantt consumer is the architecturally meaningful
move; the Nth consumer beyond that is incremental and can land in
follow-up `/gan-refactor` runs. Setting the bar to "≥ 3" would push
the generator into churning unrelated rows just to hit the count,
which works against the "behavior-preserving" envelope.
