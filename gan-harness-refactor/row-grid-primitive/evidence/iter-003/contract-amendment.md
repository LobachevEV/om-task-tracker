# Behavior-Contract Amendment — iter-003

## Surfaces Updated

### sticky_gutter_decl_count
`GanttTrackStageRow.css` count changed `1 → 0`.
The `position: sticky` declaration was in the removed `.gantt-track-stage-row__gutter` rule,
now owned by `<Gutter>` / `Gutter.css`.

### sticky_gutter_inset_inline_start
Removed `GanttTrackStageRow.css:38: inset-inline-start: 0;` entry.
Only `Gutter.css:30` remains (the canonical owner).

### border_inline_end_gutter
Removed `GanttTrackStageRow.css:40: border-inline-end: 1px solid var(--border);` entry.
Only `Gutter.css:32` remains.

### host_overflow_rules_gantt
`GanttTrackStageRow.css` line numbers shifted after the gutter block was removed
(old: 43, 122, 133, 140, 162, 170, 192, 219, 242 → new: 60, 71, 78, 100, 108, 130, 157, 180).
Net count unchanged (9 → 8 after removing the gutter overflow:hidden into Gutter.css).

### feature_row_min_height_invariant
`GanttTrackStageRow.css:36: min-height: 36px;` entry removed — that line belonged to
the migrated `.gantt-track-stage-row__gutter` rule. The outer `.gantt-track-stage-row`
rule at line 4 (`min-height: 36px`) remains, so the invariant still holds.

## Verification

All 13 contract surfaces report `"no diff"` after regenerating with
`capture-behavior-contract.mjs` and running `diff-behavior-contract.mjs`:

```
{"BEHAVIOR_DRIFT":false,"diffs":[],...}
```
