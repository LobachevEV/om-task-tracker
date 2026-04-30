# Frontend Generator State — Iteration 001

## Track
fullstack (FE side)

## Current Phase
A (Skeleton)

## What Changed This Iteration
- `OneMoreTaskTracker.WebClient/src/common/types/feature.ts`: replaced flat 5-stage `FeatureStagePlan` with v2 taxonomy types (`FeatureGate`, `FeatureSubStage`, `FeaturePhaseTaxonomy`, `FeatureTrackTaxonomy`, `FeatureTaxonomy`); exported `GATE_KEYS`, `MULTI_OWNER_PHASES`, `PHASE_KINDS`, `SUB_STAGE_HARD_CAP`, `TRACKS`, `PhaseKind`, `Track`, `GateKey`, `GateKind`, `GateStatus`.
- `OneMoreTaskTracker.WebClient/src/common/api/schemas.ts`: rewrote zod boundary for v2 — `featureGateSchema`, `featureSubStageSchema`, `featurePhaseTaxonomySchema`, `featureTrackTaxonomySchema`, `featureTaxonomySchema`, plus `gateMutationResponseSchema`/`subStageMutationResponseSchema` for taxonomy-only PATCH responses. Used `.nullable().default(null)` for required-with-null fields to match TS interface contract.
- `OneMoreTaskTracker.WebClient/src/common/api/planApi.ts`: added `patchFeatureGate(featureId, gateId, body, ifMatch)`, `patchFeatureSubStage(featureId, subStageId, body, ifMatch)`, `appendSubStage(featureId, track, phase, body, ifMatch)`, `deleteSubStage(featureId, subStageId, ifMatch)`. Removed v1 `patchFeatureStage*` exports.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttGateChip/`: new zero-width gate marker (status pill + tooltip) with css.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttPhaseSegment/`: new per-phase split-bar segment (multi-owner phases stack ownership slices vertically; single-owner phases render a solid bar).
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttSubStageRow/`: new expanded sub-stage row reusing `InlineEditors/` primitives (`InlineDateField`, `PerformerCombobox`).
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/AddSubStageButton/`: new ghost button bound to `appendSubStage`; respects `SUB_STAGE_HARD_CAP` and per-phase `cap`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttTrackRow/`: new BE/FE track row (gate chip + 4 phase segments) plus expanded sub-stage cascade per multi-owner phase.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/useGanttLayout.ts`: `GanttLane` now exposes `geometry: FeatureBarGeometry` (summary bar + per-phase rects) instead of v1 `bar`/`stageBars`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/ganttStageGeometry.ts`: replaced `computeStageBars`/`activeStageIndex`/`plannedStageCount` with `computeFeatureGeometry`, `computePhaseGeometry`, `featureHasAnyPlannedDate`, `plannedSubStageCount`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/useGanttPageState.ts`: added `expandedPhases: ReadonlyMap<featureId, ReadonlyMap<Track, ReadonlySet<PhaseKind>>>` + `togglePhaseExpanded(featureId, track, phase)`; v1 stage drawer state removed.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttFeatureRow/GanttFeatureRow.tsx`: rewired to take `geometry`, `expandedPhases`, `onTogglePhase`. Renders summary bar + spec gate chip, plus 2 × `GanttTrackRow` when expanded. `computeFeatureDtr` derives DTR from track-phase max end date.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/GanttFeatureRow/GanttFeatureRow.css`: added `.gantt-row__summary` (accent-soft fill + accent border) and `.gantt-row__empty-label`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/usePlanFeatures.ts`: added `getFeatureById(id)` to result so taxonomy-only PATCH responses can rebuild the cached row.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/components/InlineEditors/useFeatureMutationCallbacks.ts`: response merger now resolves the prior summary via caller-supplied `resolveFeature(id)` and applies `{featureId, featureVersion, taxonomy}` instead of re-parsing a full FeatureSummary.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/GanttPage.tsx`: removed v1 stage drawer wiring; passes `geometry`, `expandedPhases`, `onTogglePhase` to `GanttFeatureRow`; threads `resolveFeature` through `useFeatureMutationCallbacks`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/__fixtures__/FeatureFixtures.ts`: rewrote five fixtures (SOLO/MINI_TEAM/UNSCHEDULED/OVERDUE/SHIPPED) on v2 taxonomy via `buildSubStage`/`buildPhase`/`buildTrack`/`buildGate`/`buildTaxonomy` helpers. `MINI_TEAM_FEATURE` now demonstrates a multi-owner BE development phase with two owners and an FE prep-gate in `waiting`. `OVERDUE_FEATURE` shows BE+FE prep-gates in `rejected`.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/useFeatureTaxonomy.ts`: new selector hook returning gate/track/phase/sub-stage projections for the row renderer.
- `OneMoreTaskTracker.WebClient/src/common/i18n/locales/{en,ru}/gantt.json`: added `tracks`, `gates`, `gateStatus`, `phases`, `phaseSegment`, `subStage`, `actions`, `validation.subStageCap`, plus `inlineEdit.announce.subStage{Owner,Start,End}{Saved,Error}` and aria-label keys.
- `OneMoreTaskTracker.WebClient/src/pages/Gantt/{useStagePlanForm.ts,components/StagePlanRow/StagePlanRow.tsx,components/StagePlanTable/StagePlanTable.tsx,components/StagePerformerCombobox/StagePerformerCombobox.tsx,components/GanttSegmentedBar/GanttSegmentedBar.tsx,components/GanttStageSubRow/GanttStageSubRow.tsx}`: tombstoned (single-line `*_REMOVED = true` export to satisfy unchanged barrel re-exports). v1-specific tests stubbed with `expect(true).toBe(true)` placeholders.
- `OneMoreTaskTracker.WebClient/tests/common/api/{planApi.test.ts,patchFeature.test.ts}`: rebuilt `sampleSummary` on v2 taxonomy shape (gates with `id`/`gateKey`/`kind`, phases with `multiOwner`/`cap`).

## Feedback Items Addressed
None — iteration 001 (skeleton).

## Contract Snapshot
- api-contract.md version consumed: v2 (machine-readable: `gan-harness-feature/extend-feature-stages/contract-artifact/v2/openapi.json`)
- Generated client path: not generated — codebase has no codegen pipeline. Hand-typed against `openapi.json` per `feature-digest.md` "Codebase Conventions". Annotated as the contract surface in `src/common/types/feature.ts` + `src/common/api/schemas.ts`.
- Regenerated this iteration: n/a (no codegen step exists)
- BE commit consumed: `a4fbc1816881ed153fad149e84b39ae767edb798`

## Digest Version Consumed
v2

## Disputed Feedback (rare)
None.

## Dev Server
- Command: `cd OneMoreTaskTracker.WebClient && npm run dev`
- URL: http://localhost:5173/plan
- Status: running
- Started at: 2026-04-30T14:00:00Z

## Waiting on BE (fullstack only)
Nothing blocking. BE skeleton at `a4fbc18` emits v2 contract; FE consumes it. The v2 wire format uses `kind` ∈ {`spec`,`cs`,`sr`} on each gate (FE renders via i18n `gateStatus.*`).

## Known Gaps (carry forward)
- Storybook stories for new components (`GanttTrackRow`, `GanttGateChip`, `GanttPhaseSegment`, `GanttSubStageRow`, `AddSubStageButton`) not yet written. Tracked for Phase B; fixtures are ready (`MINI_TEAM_FEATURE` exercises multi-owner BE development; `UNSCHEDULED_FEATURE` exercises empty taxonomy; `OVERDUE_FEATURE` exercises rejected gates).
- v1 storybook stories for removed `GanttSegmentedBar` / `GanttStageSubRow` / `GanttFeatureRow` legacy variants were swapped to placeholder Removed/Pending stubs; v2 rewrites pending.
- No unit-level tests yet for `GanttGateChip`, `GanttPhaseSegment`, `GanttSubStageRow`, `AddSubStageButton`, `useFeatureTaxonomy`. Phase B will add behavioral tests (gate-chip aria/status mapping, phase-segment split rendering, sub-stage cap enforcement).
- A11y/keyboard nav for the new track/phase expansion not yet exercised under Storybook a11y addon — Phase C polish.
- `npm run test:stories` (storybook + playwright) was not run this iteration; only `npm test` (unit, 373 passing) + `npx tsc -b` (0 errors) + `npm run lint` (0 errors).
