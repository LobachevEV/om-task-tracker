Track: backend
Slice: migrate the 3 stage-level inline-edit handlers onto the iter-1 helpers and a new stage-level loader; close the LoC axis to target by extracting a `StageEditContext` + `StageEditContextLoader` helper, collapsing the duplicated stage-snapshot block in `FeatureValidation`, and inlining `ProtoStateToEntity` / `ParseStagePlans` in `UpdateFeatureHandler`.

## Migrated handlers (LoC)

| Handler | Baseline | iter-002 | iter-003 | Delta vs baseline |
|---------|----------|----------|----------|-------------------|
| UpdateFeatureTitleHandler.cs | 61 | 45 | 45 | -16 |
| UpdateFeatureDescriptionHandler.cs | 64 | 47 | 47 | -17 |
| UpdateFeatureLeadHandler.cs | 56 | 40 | 40 | -16 |
| UpdateStageOwnerHandler.cs | 67 | 67 | 39 | -28 |
| UpdateStagePlannedStartHandler.cs | 78 | 78 | 45 | -33 |
| UpdateStagePlannedEndHandler.cs | 78 | 78 | 45 | -33 |
| UpdateFeatureHandler.cs | 89 | 68 | 52 | -37 |
| **Total (axis 1)** | **493** | **423** | **313** | **-180 (-36.5%)** |

Target ≤ 320 met (313).

## Axis movement (verified at HEAD)

| # | Axis | Baseline | iter-001 | iter-002 | iter-003 | Target |
|---|------|----------|----------|----------|----------|--------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | 493 | 423 | **313** | ≤ 320 (met) |
| 2 | Manager-ownership guard literal copies in handlers | 7 | 7 | 3 | **0** | 1 (exceeded; single shared site lives in `FeatureOwnershipGuard.EnsureManager`) |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | 8 | 5 | **2** | ≤ 2 (met; the 2 sites are `SaveFeatureAsync` + `SaveStageAsync`) |
| 4 | `MapSummary` overload count | 10 | 10 | 10 | 10 | 1 (planned commits #4) |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 10 | 10 | 10 | 1 (planned commits #5) |
| 6 | Distinct `ExtractDisplayName` definitions in gateway | 2 | 2 | 2 | 2 | 1 (planned commits #6) |
| 7 | Distinct `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites | 2 | 2 | 2 | 2 | 1 (planned commits #6) |
| 8 | `dotnet build` warnings/errors | 0/0 | 0/0 | 0/0 | **0/0** | 0/0 |
| 9 | `dotnet test` regressed | 0 | 0 | 0 | **0** | 0 (442/442 green; +5 over iter-002) |

## Files touched

Modified (3 stage handlers + 2 supporting):
- `OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs` — replaced inline `Include + guard + version + try/catch` with `StageEditContextLoader.LoadAsync` + `FeatureConcurrencySaver.SaveStageAsync`.
- `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedStartHandler.cs` — same migration; collapsed snapshot-build onto `FeatureValidation.ValidateStageOrderWithOverride`.
- `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedEndHandler.cs` — same migration.
- `OneMoreTaskTracker.Features/Features/Data/FeatureValidation.cs` — added `ValidateStageOrderWithOverride(feature, stageOrdinal, plannedStart, plannedEnd)` overload.
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs` — Boy-Scout: inlined `ProtoStateToEntity` private helper (only one call site) and converted `ParseStagePlans` foreach into a LINQ `Select`.

New (one type per file):
- `OneMoreTaskTracker.Features/Features/Update/StageEditContext.cs` — `readonly record struct` carrying `(Feature, FeatureStagePlan, StageOrdinal)` produced by the loader.
- `OneMoreTaskTracker.Features/Features/Update/StageEditContextLoader.cs` — single async loader running id-validation → stage-validation → load → ownership-guard → stage-resolve → stage-version-guard.
- `tests/OneMoreTaskTracker.Features.Tests/Features/Update/StageEditContextLoaderTests.cs` — 5 [Fact]s exercising every error branch + the happy path.

## Subtleties preserved

- `+1` version bumps stay leaf-side: `plan.Version = stageVersionBefore + 1`, `feature.Version = featureVersionBefore + 1`. Loaders/guards never touch `Version`.
- `RecomputeFeatureDates` stays sequenced between stage mutation and `SaveStageAsync` in both planned-start/planned-end handlers.
- `FeatureLoader.ResolveStage` still receives `request.Stage.ToString()` so the emitted `Status.Detail` continues to read `"stage Development not found"` (proto-enum name, not numeric ordinal).
- Status codes preserved: `InvalidArgument` (id/stage validation, leaf-side via `StageEditContextLoader` for the FeatureId/Stage gates; date-parse and stage-order via `FeatureValidation`); `NotFound` (`FeatureLoader`); `PermissionDenied` (`FeatureOwnershipGuard`); `AlreadyExists` (`FeatureVersionGuard` + `FeatureConcurrencySaver`); `FailedPrecondition` (`FeatureValidation.ValidateStageOrder`).
- Status-detail strings byte-identical: `"feature_id is required"`, `"stage is required"`, `"feature {id} not found"`, `"stage {Stage} not found"`, `"Not the feature owner"`, `ConflictDetail.VersionMismatch(currentVersion)`.
- Log templates byte-identical: every leaf still calls `LogInformation` with the same template prefix and structured field names; only the line numbers in the captured surface shift.

## Behavior-contract drift (within planner tolerance)

- `openapi_json`, `features_proto_surface`, `ef_migrations_history`, `ef_schema_columns`, `feature_entity_shape`, `api_endpoint_matrix`: no diff.
- `grpc_status_code_emit_sites`: 33 → 15 lines. All sites stay inside `OneMoreTaskTracker.Features/Features/`. Set of distinct codes unchanged: `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}`. Per plan §"Tolerance pinning — `grpc_status_code_emit_sites` will move".
- `feature_inline_edit_log_format`: 7 → 7 lines, byte count identical. Only line-number prefixes shifted (handlers shrank). Per plan §"Tolerance pinning — `feature_inline_edit_log_format` will reorder".
- `test_corpus_assertion_count`: 873 → 887 (+14, all from `StageEditContextLoaderTests`). Strict superset, additive.

## Boy-Scout in-scope tightenings

- Inlined `UpdateFeatureHandler.ProtoStateToEntity` (only one call site, 5 lines saved).
- Replaced the `foreach` in `UpdateFeatureHandler.ParseStagePlans` with a LINQ `Select` and inlined the helper at the call site (8 lines saved). The unused `ProtoFeatureStagePlan` alias was removed alongside.

## Deviations from `refactor-plan.md` §"Planned commits"

None. This is plan commit #3 verbatim, plus a small Boy-Scout pass on `UpdateFeatureHandler` to land axis 1 ≤ 320.
