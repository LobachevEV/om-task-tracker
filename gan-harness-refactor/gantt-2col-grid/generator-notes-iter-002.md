# Generator Notes — Iter 002

## Slice taken

Entire iter-2 scope: fix all three AUTO_FAIL gates from iter-1 evaluation.

## MUST-improve axes touched

**Axis 1 — Bundle size (RF-001-01)**
- Before: 186,369 gzipped bytes (ceiling 186,361, delta +8)
- After: 186,359 gzipped bytes (delta -2)
- Fix: moved `position:sticky; inset-inline-start:0` back onto `.gantt-row-frame__gutter`
  directly (eliminating the compound `.gantt-page__lanes .gantt-row-frame__gutter` rule).
  The compound selector added ~12 gzip bytes vs the simple rule costs fewer due to
  back-reference compression with existing `gantt-row-frame__gutter` tokens in the same file.
  Also added `position:relative` to `.gantt-row-frame` (needed for sticky containing block).

**Axis 2 — Playwright regressions (RF-001-04)**
- `position:relative` on `.gantt-row-frame` restores the sticky containing block,
  which subgrid children require cross-browser (stickiness breaks when the containing
  block is a non-positioned grid parent).

**Axis 3 — Column-alignment spec selectors (RF-001-02)**
- Fixed `.gantt-track-band__gutter` → `.gantt-track-band__header .gantt-row-frame__gutter`
  and `.gantt-track-stage-row .gantt-row-frame__gutter` to match actual DOM after subgrid refactor.
  Updated `spec_status_at_iter0` in behavior-contract.json from `not_yet_authored` to `authored_iter2`.

**Axis 4 — Dead CSS removal (code-quality)**
- Removed `width:100%` from `.gantt-row__grid` and `.gantt-track-band__grid`
- Removed `.gantt-track-stage-row__lane { height:36px }` and `.gantt-row__lane { height:100% }`
- Removed 3-line comment block and inline breakpoint comments from GanttTrackStageRow.css

## Files touched

6 files, all CSS or spec:
- `GanttRow/GanttRow.css` — add position:relative to frame, restore sticky on gutter
- `GanttPage/GanttPage.css` — remove compound gutter rule, port .gantt-row__grid breakpoints
- `GanttFeatureRow/GanttFeatureRow.css` — remove dead .gantt-row__lane height
- `GanttFeatureTrackBand/GanttFeatureTrackBand.css` — remove dead width:100%
- `GanttTrackStageRow/GanttTrackStageRow.css` — remove dead lane height + width + comments
- `e2e/specs/_harness/column-alignment.spec.ts` — fix DOM selectors

## Deviations from planned commits

- RF-001-03 (Axis 5 — track-band hardcoded `--gantt-row-columns` inside `.tsx` body) remains
  blocked. The fix requires editing `GanttFeatureTrackBand.tsx` body, which is in MUST-NOT-touch.
  Surfaced as a blocker note for the evaluator.

## Key insight on bundle

CSS comments are stripped by the minifier before gzip runs, making comment removal a
no-op for gzip size. The only lever is reducing unique CSS declaration tokens. Moving the
sticky rule from a compound selector to the base selector saved ~10 gzip bytes by improving
LZ77 back-reference hits against existing `gantt-row-frame__gutter` occurrences.
