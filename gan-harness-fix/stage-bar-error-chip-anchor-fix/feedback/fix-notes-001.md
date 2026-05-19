## fix-notes-001 — iter 1

**Issues closed:** anchor-bug (chip at lane-origin for empty-bar drags), overflow-bug (chip bleeds into gutter)

**Strategy:** pinned (both bugs, single iteration, same component files)

**Files touched (3):**
- `GanttTrackStageRow.tsx` — import `dateToPixel`; rewrite `handleFail` to compute `barLeftPx` from `range.plannedStart ?? range.plannedEnd` via `dateToPixel`, falling back to today-line when both are null; `Math.max(0,…)` clamp; updated useCallback deps
- `GanttTrackStageRow.css` — replaced `overflow: visible` with `overflow-x: clip; overflow-y: visible`
- `GanttTrackStageRow.test.tsx` — new describe block; mocks `StageBarDateEditor` to fire `range={plannedStart:'2026-06-15'}`, asserts chip anchor `left` equals `daysBetween(loadedRange.start, '2026-06-15') * dayPx` and is `> 0`

**Quality gates:** lint clean, tsc clean, 699/699 tests pass, build clean

**Deviations:** none — implemented spec options A→B as described
