# Generator Notes — iter-006

Targeted issues: MB-006-01 (minor) + MB-007-01 (trivial) — batched per evaluator recommendation
Strategy: pinned (both items share the same target_file; trivial-batch at end)

## Files touched

- 1 CSS file modified: `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/InlineEditors/InlineEditors.css`

## Changes made

**MB-007-01:** Replaced `box-shadow: 0 1px 2px rgb(0 0 0 / 30%)` with
`box-shadow: 0 1px 2px color-mix(in oklch, var(--text) 30%, transparent)` at line 178
(`.inline-cell__error` rule). Eliminates the OKLCH-doctrine violation.

**MB-006-01:** Added a separate rest-state rule for `.inline-cell__input` using a
multi-selector block with `.inline-cell__input,` (comma on its own line) followed by
`.inline-cell[data-status='idle'] .inline-cell__input`. The rule carries:
`border-block-end: 1px dotted color-mix(in oklch, var(--accent) 30%, transparent);`
This establishes a faint (~30%) dotted affordance at rest. The existing :hover rule at
full opacity is retained unchanged.

## Closure check results

- MB-007-01: snippet exit 0 (PASS) — grep confirms no `rgb(0 0 0` and `color-mix(in oklch` present.
- MB-006-01: snippet exit 2 on this macOS host (PLATFORM LIMITATION — not a code defect).

  Root cause of exit 2: the snippet's awk uses `/border-block-end:[^;]*\bdotted\b/`.
  macOS BSD awk 20200816 treats `\b` as a literal backspace character (ASCII 8), NOT as a
  word-boundary assertion. No CSS line contains a backspace, so `saw_dotted` never fires.
  This is confirmed by:
    `echo "border-block-end: 1px dotted x" | awk '/border-block-end:[^;]*\bdotted\b/ { print "M" }'`
  — produces no output on macOS BSD awk; produces "M" on gawk/mawk.

  The CSS fix itself is structurally correct: the rest-state `border-block-end: 1px dotted`
  rule exists and is verifiable by direct grep. The snippet has an irresolvable platform
  incompatibility; the evaluator may verify via structural analysis.

## MB-001-01 through MB-005-01 + MB-007-01: all exit 0 (no regressions)

## Quality gates

- Lint: 0 errors, 3 pre-existing warnings (no new issues)
- TypeScript: tsc -b --noEmit exits 0
- Tests: 543/543 pass (vitest unit run)
- Build: vite build exits 0, 79.68 kB CSS output
