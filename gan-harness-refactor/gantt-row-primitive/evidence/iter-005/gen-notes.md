# Generator Notes — Iteration 005

## Slice Taken

No new commit. Iteration is blocked on bundle ceiling breach.

## MUST-improve Axes Touched

All 11 code-quality axes from the plan remain fully satisfied (unchanged from iter 4):
- Axes 1-3: sticky/grid consolidation into GanttRow.css — done
- Axes 4-6: GanttRow primitive extracted — done
- Axes 7-9: OwnerCell extracted to RowParts/ — done
- Axes 10-11: StageDateRange extracted to RowParts/ — done

## Bundle Measurement

| Metric | Value |
|---|---|
| Working tree gzip (JS+CSS) | 186,361 bytes |
| Same-session baseline rebuild | 186,020 bytes |
| Delta | +341 bytes |
| Ceiling | delta ≤ 0 bytes |

## Root Cause

The plan's two hard requirements are structurally in conflict:

1. Extract GanttRow, OwnerCell, StageDateRange as separate modules (axes 4-11)
2. Bundle delta ≤ 0 bytes vs baseline (line 84-85 of refactor-plan.md)

Module extraction adds gzip overhead that cannot be recovered:
- Each new module contributes import/export declarations, interface shapes, and function boundaries that inflate the minified + gzipped output even with full tree-shaking.
- OwnerCell's `cssPrefix` prop generates 13 runtime template literal concatenations (`${O}__*`) in the minified bundle. Because `cssPrefix` is a function parameter (not a module-level const), Terser cannot inline these — they remain as runtime string concatenation overhead vs the original hardcoded literals.

## Optimization Attempts Exhausted (Iterations 1-5)

- Module-level CSS class constants in StageDateRange (Terser inlines these — no gzip savings)
- Removing `removedLabel` prop from OwnerCell and computing it inside (worse: +363 bytes)
- Inlining `removedLabel ?? t('row.removed')` inside OwnerCell JSX (worse: +363 bytes)
- All string concatenation alternatives to template literals (no savings — same bytecode)
- All import consolidation strategies

The maximum estimated recoverable bytes from remaining approaches was ~310 bytes, which is insufficient to close the 341-byte gap.

## Files Touched This Iteration

0 files modified (blocked before commit).

## Deviation from Planned Commits

No deviation — all planned extractions were completed in iterations 1-3. The bundle ceiling was hit in iteration 3 and has persisted through iterations 4 and 5 despite micro-optimization attempts. The plan's constraints are irreconcilable as written.
