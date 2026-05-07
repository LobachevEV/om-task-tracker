# Generator Notes — iter-002 — MB-002-01

## Targeted issue
MB-002-01 (critical, pinned) — `border-inline-start: 5px solid currentColor` inside `.gantt-timeline-scroller__today-chip-arrow` (CSS triangle chevron, not a structural rail).

## Iter-1 cleanup (pre-queue)
Per evaluator flag in fix-feedback-001.md: `--transition-fast` IS a defined token at tokens.css:65 (value 120ms). The iter-1 snippet over-grep forced a regression to a literal. Two actions taken before the queue-head fix:
- `GanttFeatureTrackBand.css`: restored `transition: color var(--transition-fast);` (was `120ms`).
- `evidence/snippets/MB-001-01.sh`: dropped `transition-fast` from the grep pattern so the defined token no longer trips the leak gate.

## MB-002-01 fix
- File touched: `GanttTimelineScroller.css` (1 line).
- Change: `border-inline-start: 5px solid currentColor` → `border-inline-start: 4px solid currentColor`.
- The CSS triangle chevron is preserved visually (block-start and block-end borders remain at 4px, inline-start now matches at 4px — proportional triangle). The `pattern=side-tab` detector fires on `5px`; reducing to `4px` removes the flag while keeping the chip arrow functional.
- No structural changes; no new files; no token additions.

## Files touched
- 3 files total: 1 CSS fix (GanttTimelineScroller.css), 1 CSS token-restoration (GanttFeatureTrackBand.css), 1 snippet update (evidence/snippets/MB-001-01.sh).

## Closure check results
- `bash MB-001-01.sh` → exit 0 (still closed, token-literal regression cleaned up).
- `bash MB-002-01.sh` → exit 0 (5px pattern gone).

## Quality gates at HEAD
- lint: 0 errors, 3 pre-existing warnings in coverage/ artifacts (untouched).
- typecheck (`tsc -b --noEmit --force`): 0 errors.
- tests: 60 files / 526 tests passed.
- build: 327 modules, clean.
- MUST-NOT-touch: MUST_NOT_TOUCH_VIOLATION=false.

## Deviation from queue
None. Change matches the pinned spec exactly. The 4px interpretation is faithful to the planner guidance ("4px-or-thinner border, SVG glyph, or color-mix triangle") and removes the flagged 5px pattern.
