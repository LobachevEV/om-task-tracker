# generator-notes-iter-006

## Slice f — BREAKING deletion sweep

Per-field PATCH surfaces and the bulk `UpdateFeatureHandler` are deleted entirely.
The consolidated `PatchFeatureHandler` (feature-scoped) and `PatchFeatureStageHandler`
(stage-scoped) are now the only feature/stage write paths.

## Decision: bulk handler — option (b) delete

Iter-5 evaluator's grep confirmed zero FE call sites send a `stagePlans:` payload.
The bulk path was already dead behind the always-sparse FE; iter-4 collapsed
the gateway fork; iter-5 introduced `PatchFeatureHandler` as the survivor.
Option (a) "keep but mark internal" carries no callers, so it is removed.

## BE deletions

Handlers (7):

- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureDescriptionHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureLeadHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedStartHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedEndHandler.cs`

Proto files (7):

- `OneMoreTaskTracker.Features/Protos/UpdateFeatureCommand/update_feature_command_handler.proto`
- `OneMoreTaskTracker.Features/Protos/UpdateFeatureTitleCommand/update_feature_title_command_handler.proto`
- `OneMoreTaskTracker.Features/Protos/UpdateFeatureDescriptionCommand/update_feature_description_command_handler.proto`
- `OneMoreTaskTracker.Features/Protos/UpdateFeatureLeadCommand/update_feature_lead_command_handler.proto`
- `OneMoreTaskTracker.Features/Protos/UpdateStageOwnerCommand/update_stage_owner_command_handler.proto`
- `OneMoreTaskTracker.Features/Protos/UpdateStagePlannedStartCommand/update_stage_planned_start_command_handler.proto`
- `OneMoreTaskTracker.Features/Protos/UpdateStagePlannedEndCommand/update_stage_planned_end_command_handler.proto`

csproj entries (7) removed from `OneMoreTaskTracker.Features.csproj` and
`OneMoreTaskTracker.Api.csproj`.

`Program.cs` (Features service) drops 7 `MapGrpcService` registrations; only
`CreateFeatureHandler`, `ListFeaturesHandler`, `GetFeatureHandler`,
`PatchFeatureHandler`, `PatchFeatureStageHandler` remain.

Mapster `FeatureMappingConfig.Register` no longer registers configurations for
the deleted DTOs.

`StagePlanUpserter.cs` is reduced to `RecomputeFeatureDates`. Dead members
removed: `ApplyStagePlans`, `NormalizePerformer`. Comment block reduced.

`FeatureValidation.cs` drops `ValidateStagePlans` and the
`StagePlanInput` record struct. `CanonicalStageOrdinals` removed (only consumer
was the deleted `ValidateStagePlans`).

## Gateway deletions

Controllers (2 directories of payloads + 2 controllers):

- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields/FeatureFieldsController.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields/UpdateFeatureTitlePayload.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields/UpdateFeatureDescriptionPayload.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields/UpdateFeatureLeadPayload.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/FeatureStagesController.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/UpdateStageOwnerPayload.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/UpdateStagePlannedStartPayload.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/UpdateStagePlannedEndPayload.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/StagePlanPayload.cs` (orphaned by removal of `UpdateFeaturePayload.StagePlans`)
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/UpdateFeatureRequestFactory.cs`

Surviving controllers: `FeaturesController` (collapsed `Update` to always-sparse
PATCH; no fork on `body.StagePlans`, calls only `featurePatcher.PatchAsync`),
`PatchFeatureStageController`.

`UpdateFeaturePayload` reduced to `(Title?, Description?, LeadUserId?, ExpectedVersion?)`.

`Program.cs` drops 7 `AddGrpcClient` registrations:
`FeatureUpdater`, `FeatureTitleUpdater`, `FeatureDescriptionUpdater`,
`FeatureLeadUpdater`, `StageOwnerUpdater`, `StagePlannedStartUpdater`,
`StagePlannedEndUpdater`. Survivors:
`FeatureCreator`, `FeaturesLister`, `FeatureGetter`, `FeaturePatcher`,
`FeatureStagePatcher` (+ `TaskFeatureLinker` on the Tasks side).

`PlanMapper.cs` drops 7 `MapSummary` overloads + 7 `using` aliases for the
deleted DTOs. Survivors: `CreateFeatureDto`, `GetFeatureDto`, `ListFeatureDto`,
`PatchFeatureDto`, `PatchFeatureStageDto`, plus `ProtoFeatureStagePlan`.

`openapi.json` drops 6 deprecated path keys (`/lead`, `/title`, `/description`,
`/stages/{stage}/owner`, `/planned-start`, `/planned-end`) and 7 schemas
(`StagePlanPayload`, `UpdateFeatureLeadPayload`, `UpdateFeatureTitlePayload`,
`UpdateFeatureDescriptionPayload`, `UpdateStageOwnerPayload`,
`UpdateStagePlannedStartPayload`, `UpdateStagePlannedEndPayload`).
The `UpdateFeaturePayload` schema is tightened to
`(title, description, leadUserId, expectedVersion)` and the PATCH description
prose drops the legacy "stagePlans bulk" paragraph.

## FE deletions

`OneMoreTaskTracker.WebClient/src/common/api/planApi.ts` drops 7 exports:
`updateFeature`, `updateFeatureTitle`, `updateFeatureDescription`,
`updateFeatureLead`, `updateStageOwner`, `updateStagePlannedStart`,
`updateStagePlannedEnd`. Survivors: `listFeatures`, `getFeature`,
`createFeature`, `attachTask`, `detachTask`, `patchFeature`,
`patchFeatureStage`. No JSDoc/comment refers to refactor-harness labels.

`schemas.ts` drops 5 per-field request schemas
(`updateFeatureTitlePayloadSchema`, `updateFeatureDescriptionPayloadSchema`,
`updateStageOwnerPayloadSchema`, `updateStagePlannedStartPayloadSchema`,
`updateStagePlannedEndPayloadSchema`).

`types/feature.ts` drops 7 deprecated request types
(`UpdateFeaturePayload`, `UpdateFeatureTitlePayload`,
`UpdateFeatureDescriptionPayload`, `UpdateFeatureLeadPayload`,
`UpdateStageOwnerPayload`, `UpdateStagePlannedStartPayload`,
`UpdateStagePlannedEndPayload`). Survivors: `PatchFeaturePayload`,
`PatchFeatureStagePayload`.

`tests/common/api/planApi.test.ts` drops the `describe('updateFeature', …)`
block and the corresponding import.

## Test deletions / rewrites

Deleted test files (6):

- `tests/OneMoreTaskTracker.Api.Tests/Controllers/InlineEditEndpointsTests.cs` (882 lines, 100% coverage of deleted per-field controllers)
- `tests/OneMoreTaskTracker.Features.Tests/UpdateFeatureHandlerTests.cs` (bulk handler)
- `tests/OneMoreTaskTracker.Features.Tests/Features/Update/UpdateFeatureTitleHandlerTests.cs`
- `tests/OneMoreTaskTracker.Features.Tests/Features/Update/UpdateFeatureDescriptionHandlerTests.cs`
- `tests/OneMoreTaskTracker.Features.Tests/Features/Update/UpdateStageOwnerHandlerTests.cs`
- `tests/OneMoreTaskTracker.Features.Tests/Features/Update/UpdateStagePlannedStartHandlerTests.cs`
- `tests/OneMoreTaskTracker.Features.Tests/Features/Update/UpdateStagePlannedEndHandlerTests.cs`

Rewritten test files:

- `PlanControllerStagePlansTests.cs` — kept 6 tests (sparse-patch routing, performer-roster resolution, stale-performer fallback, ownership 403, JWT propagation, list stagePlans), dropped 6 tests using the now-deleted `MockFeatureUpdater`.
- `FeatureStagePlanHandlerTests.cs` — kept 3 tests (`Create_MaterializesFiveEmptyStagePlansAtomically`, `Get_IncludesFiveStagePlansOrderedByStage`, `List_IncludesFiveStagePlansPerFeature`); dropped 7 `Update_*` tests that exercised the deleted bulk path. Coverage of per-stage validation and recompute lives in `Features/Update/PatchFeatureStageHandlerTests.cs`.
- `HandlerRegistrationTests.cs` — `UpdateFeatureHandler_ReturnsNotFoundForUnknownId` replaced with `PatchFeatureHandler_ReturnsNotFoundForUnknownId`.
- `FeatureAggregateTests.cs` / `FeatureStagePlanAggregateTests.cs` — seed initializers no longer assign `Version`/`UpdatedAt` (now `private set`); tests assert delta-from-zero, equivalent to the original delta-from-N invariant.
- `ApiWebApplicationFactory.cs` and `TasksControllerWebApplicationFactory.cs` — drop registrations + `Mock*` properties for the 7 deleted gRPC clients.
- `ProgramDiTests.cs` — drops 7 `GetRequiredService` calls + 7 `using` directives.

## Aggregate-invariant tightening (RF-001)

`Feature.UpdatedAt` and `Feature.Version` setters are now `private set`.
`FeatureStagePlan.UpdatedAt` and `FeatureStagePlan.Version` setters are now
`private set`. EF Core hydrates via reflection (no change to `OnModelCreating`).

Construction-site migration:

- `OneMoreTaskTracker.Features/Features/Create/CreateFeatureHandler.cs` — drop `UpdatedAt = now` from object initializers; call `feature.Touch(now)` and `plan.Touch(now)` immediately after construction.
- `OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs` — same treatment.

The only writers to `UpdatedAt`/`Version` outside of construction are the
aggregate methods on `Feature` (`RenameTitle`, `SetDescription`, `AssignLead`,
`RecordStageEdit`, `Touch`) and on `FeatureStagePlan` (`AssignOwner`,
`SetPlannedStart`, `SetPlannedEnd`, `Touch`). Verified via grep
`\.UpdatedAt\s*=\|\.Version\s*=` over `OneMoreTaskTracker.Features/`.

## RF carry-overs resolved

- **RF-001** — invariants tightened (see above).
- **RF-002** — bulk handler deleted (option b).
- **RF-004** — gateway no longer forks on `body.StagePlans`; always-sparse PATCH.
- **RF-005** — 6 deprecated openapi paths removed; per-field FE exports deleted.
- **RF-008** — no JSDoc/comment refers to refactor-harness labels (`slice (f)`, `iter-006`, `RF-NNN`) in any production source or test.

## Test-count delta

| Project                      | Before | After | Delta |
|------------------------------|-------:|------:|------:|
| Features.Tests               |    113 |    84 |   -29 |
| Api.Tests                    |    250 |   174 |   -76 |
| Tasks.Tests                  |     59 |    59 |     0 |
| Users.Tests                  |     32 |    32 |     0 |
| GitLab.Proxy.Tests           |     63 |    63 |     0 |
| **BE total**                 |    517 |   412 |  -105 |
| WebClient (vitest)           |    485 |   464 |   -21 |

(BE before-counts are the iter-5 baselines from `baseline-tests.backend.json`;
FE before-count from `baseline-tests.frontend.json`. Net deletion is the
expected outcome of removing 7 handlers + 7 controllers + their dedicated
suites; surviving paths still exercise the consolidated PATCH end-to-end.)

## Build / test verification

- `dotnet build` — green, 0 warnings, 0 errors.
- `dotnet test` — green, 412/412 passed across 5 projects.
- `npm run build` (vite + tsc) — green.
- `npm test` (vitest) — green, 464/464 passed across 54 files.

## Dangling-import / dead-reference audit

Greps run before commit:

- `grep -rn "UpdateFeatureCommand\|UpdateFeatureTitleCommand\|UpdateFeatureDescriptionCommand\|UpdateFeatureLeadCommand\|UpdateStageOwnerCommand\|UpdateStagePlannedStartCommand\|UpdateStagePlannedEndCommand"` over `OneMoreTaskTracker.{Api,Features}` and `tests/` — no production hits (only generated files under `obj/`).
- `grep -rn "StagePlanInput\|ValidateStagePlans\|ApplyStagePlans"` over `*.cs` — no hits.
- `grep -rn "updateFeature\|updateStage"` over `OneMoreTaskTracker.WebClient/src/` — no hits in the API surface (only domain words in test fixtures).
- `grep "UpdatedAt\s*=\|Version\s*="` outside `Feature.cs`/`FeatureStagePlan.cs` and tests — no external writers.

## Honor pledges

- One type per file.
- No log-only locals introduced.
- Conventional commit subject with `!` for breaking change.
- No untracked PNGs or `gan-harness-refactor/` staged.
