# Axis 1 Grep Amendment — iter-003

## Problem (RF-002-02)

The original Axis 1 source-of-truth grep counted ALL `grid-template-columns:` declarations
in the three row CSS files, including the outer row grid (`var(--gantt-gutter-width, 280px) 1fr`).
This outer declaration is MUST-NOT-touch and cannot be moved to Gutter.css.
As a result, the axis could never reach 0 even after full inner-grid migration.

## Fix

The grep now filters to only bracket-syntax declarations (`grid-template-columns:\s*\[`)
which exclusively targets named-line inner grids like `[code] 28px [label] 1fr ...`.

Old command:
```
grep -cE 'grid-template-columns:' ... | awk ... → expects 0
```

New command (amended in refactor-plan.md §"Target axes"):
```
grep -cE 'grid-template-columns:\s*\[' ... | awk ... → expects 0
```

## Verification

Running the amended command post-iter-003 migration:
```
cd OneMoreTaskTracker.WebClient && grep -cE 'grid-template-columns:\s*\[' \
  src/pages/Gantt/components/{GanttFeatureRow,GanttFeatureTrackBand,GanttTrackStageRow}/*.css \
  | awk -F: '{s+=$2} END {print s}'
```
Result: `0` — axis 1 target achieved.

The outer `var(--gantt-gutter-width, 280px) 1fr` declarations remain in each row CSS file
(MUST-NOT-touch), and are correctly excluded from the axis 1 count by the `\[` filter.
