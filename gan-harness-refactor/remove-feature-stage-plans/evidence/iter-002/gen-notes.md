# Generator Notes — Iter 002

## Slice taken

Close all RF-001-xx issues from iter-1 feedback: gateway flatten (RF-001-01/02/04), chronological-order tests (RF-001-03), sparse-patch field coverage tests (RF-001-06), FE cleanup (RF-001-07/08).

## MUST-improve axes touched

- **test-coverage**: +19 tests (.NET) across Features.Tests and Api.Tests
  - 5 chronological-order boundary + happy-path tests (`PatchFeatureHandlerTests`)
  - 12 sparse field forwarding + 422 shape + response-body flat-field tests (`PatchFeatureSparseEndpointTests`)
  - 2 legacy stage-plan tests deleted (exercised deleted code)
- **code-deletion**: Removed `StagePlanDetailResponse.cs`, `BuildDetailStagePlans`, `ResolvePerformer`, `plan.stage-planning.spec.ts`
- **naming**: `getStagePlan`→`getStageWindow`, `StagePlanFlat`→`StageWindow` in ganttStageGeometry.ts + 3 consumers

## Files touched (13 files)

- **API records/controller** (3): `FeatureSummaryResponse.cs` (+15 flat fields), `FeatureDetailResponse.cs` (drop StagePlans param), `FeaturesController.cs` (delete BuildDetailStagePlans + ResolvePerformer)
- **Deleted** (2): `Stages/StagePlanDetailResponse.cs`, `e2e/specs/plan.stage-planning.spec.ts`
- **FE geometry** (4): `ganttStageGeometry.ts` (rename), `GanttFeatureRow.tsx`, `GanttSegmentedBar.tsx`, `GanttStageSubRow.tsx` (import rename)
- **FE inline editor** (1): `InlineOwnerPicker.tsx` (remove stale comment)
- **Tests** (3): `PatchFeatureHandlerTests.cs` (+5 tests), `PatchFeatureSparseEndpointTests.cs` (+12 tests), `PlanControllerStagePlansTests.cs` (-2 legacy tests)

## Deviations from planned commits

None — this iteration closes the full RF-001 feedback backlog as a single composite commit per harness protocol.

## Quality gates

- dotnet lint/build: PASS (0 warnings, 0 errors)
- dotnet test: PASS (541/541 across all 5 test projects)
- npm lint: PASS (0 errors)
- npm build: PASS (1277 modules, no errors)
- npm test: PASS (522/522 across 58 test files)
- must-not-touch: PASS (0 violations, 85 files checked)
