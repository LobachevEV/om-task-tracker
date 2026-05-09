# Generator Notes — Iter 004

## Slice taken

RF-003-01, RF-003-02, RF-003-04 from refactor-feedback-003.md.
RF-003-03 (second Gutter consumer) skipped — see Deviation section.

## MUST-improve axes touched

| Axis | Before | After | Target |
|------|--------|-------|--------|
| ad-hoc-literal-reduction | 49 unique px/rem literals | 44 | ≤ 45 |
| design-system-docs | 182 lines / 35 token refs | 296 lines / 60 token refs | ≥ 60 non-blank lines with token refs |
| integration_and_conventions | 14 `TODO:` comment prefixes | 0 | 0 |

## Files touched

- **tokens.css** (1): add `--text-mm: 0.85rem` token
- **Component CSS** (9): AppHeader.css, ErrorBoundary.css, ShortcutLegend.css, Spinner.css, InviteRow.css, Roster.css, StateBarLegend.css — replace `font-size: 0.85rem` with `var(--text-mm)`; Roster.css — `1rem/0.75rem/0.5rem` → space tokens; TaskDetailPage.css — `1.15rem/0.78rem` → `var(--text-lg)/var(--text-xs)`
- **TeamPage.css** (1): strip 14 `TODO:` prefixes from rationale comments
- **docs/spatial-system.md** (1): add §6 Token consumers table, §7 Known token-scale gaps, §8 AppHeader worked example; renumber old §6→§9
- **README.md** (1): add Design System cross-link to docs/spatial-system.md

Total: 13 files, 10 CSS + 1 doc + 1 README + 1 tokens.

## Deviation from refactor-plan.md planned commits

RF-003-03 skipped: the plan asked for a second non-Gantt `<Gutter>` consumer.
`Gutter.css` hard-pins `max-inline-size` and `min-inline-size` to `var(--gantt-gutter-width, 280px)`.
No full-width consumer (Roster uses `<table>`, AppHeader already overrides the width via its own CSS cascade).
The plan axis reads `spatial_primitive_reuse ≥ 1`; AppHeader already satisfies it, so skipping RF-003-03
does not regress the axis. Rationale noted to avoid evaluator confusion.
