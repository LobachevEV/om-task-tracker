# Iter 001 — Introduce inline-edit scaffolding helpers

## Slice taken

Iter-1 scope per refactor-plan.md "Planned commits" #1: introduce shared scaffolding +
unit tests, no call-site migration. Split the planned `FeatureUpdateScaffolding.cs`
single file into four focused single-responsibility helpers (one type per file
project rule, plus tighter cohesion than a god-helper):

- `OneMoreTaskTracker.Features/Features/Update/FeatureOwnershipGuard.cs` —
  manager-ownership guard. Hosts the single canonical site for
  `CallerUserId <= 0 || feature.ManagerUserId != callerUserId` (axis 2; baseline 7
  copies).
- `OneMoreTaskTracker.Features/Features/Update/FeatureVersionGuard.cs` —
  feature-version + stage-version `If-Match` mismatch guards. Both raise
  `AlreadyExists` with `ConflictDetail.VersionMismatch(currentVersion)`.
- `OneMoreTaskTracker.Features/Features/Update/FeatureLoader.cs` —
  `LoadWithStagePlansAsync` + `ResolveStage` (the `Include(StagePlans).FirstOrDefault`
  + NotFound and the per-stage NotFound).
- `OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs` —
  `SaveFeatureAsync` / `SaveStageAsync`. Owns the
  `try { SaveChangesAsync } catch (DbUpdateConcurrencyException) { Reload + throw AlreadyExists }`
  pattern (axis 3; baseline 6 copies).

## MUST-improve axes touched (this iteration)

No call-site migration → axis numbers do NOT move yet, by design.

| Axis | Baseline | Now | Notes |
|------|----------|-----|-------|
| Total LoC across 7 inline-edit handlers | 493 | 493 | unchanged (call-site migration is iter-2/3) |
| Manager-ownership guard literal copies | 7 | 7 | shared site exists in `FeatureOwnershipGuard`; iter-2 collapses callers |
| `catch (DbUpdateConcurrencyException)` blocks | 6 | 6 | shared site exists in `FeatureConcurrencySaver`; iter-2/3 collapses callers |

The per-iteration metric-movement contract for iter-1 is: "scaffolding exists, callers
unchanged, build + tests green." That's met.

## Files touched

New files only — zero edits to existing source.

- 4 new source files under `OneMoreTaskTracker.Features/Features/Update/`
- 4 new test files under `tests/OneMoreTaskTracker.Features.Tests/Features/Update/`
  (18 new `[Fact]`s total: 4 ownership + 6 version-guard + 4 loader + 4 concurrency)

No existing handler / mapper / controller / proto / migration / DI / csproj was modified.

## Behavior contract diff (re-captured at HEAD before commit)

- `openapi_json`: no diff
- `features_proto_surface`: no diff
- `ef_migrations_history`: no diff
- `ef_schema_columns`: no diff
- `feature_entity_shape`: no diff
- `api_endpoint_matrix`: no diff
- `feature_inline_edit_log_format`: no diff
- `grpc_status_code_emit_sites`: text differs (33→37 lines). Within planner-pinned
  tolerance: drift is purely additive — new `RpcException` sites in helper files
  inside `OneMoreTaskTracker.Features/Features/...`; the **set** of distinct status
  codes is unchanged (`{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}`,
  same as baseline; `FailedPrecondition` listed in plan but not present at 935dc9a is
  still absent — no new code class).
- `test_corpus_assertion_count`: 831 → 873 (+42). Within planner-pinned tolerance:
  "strict-superset additive drift is acceptable — count MAY rise but MUST NOT fall."
  No existing assertion deleted or reworded.

## Decisions / tradeoffs

- **Four helpers, not one `FeatureUpdateScaffolding` god-helper.** Plan said either,
  with one-type-per-file as the hard constraint. Four small static helpers compose
  more naturally at iter-2 call sites than one helper with five static methods on
  unrelated concerns, and they keep test files focused.
- **`public static` rather than `internal` + `InternalsVisibleTo`.** Existing siblings
  (`FeatureMappingConfig`, `FeatureValidation`) are `public static`. Avoids
  `[assembly: InternalsVisibleTo]` infra churn for a refactor.
- **`FeatureLoader.ResolveStage` takes `stageDisplay: string`** rather than the proto
  enum so it stays decoupled from any specific generated `FeatureState` type. Each
  call-site passes the proto enum's `ToString()` (matches baseline error text
  `"stage {request.Stage} not found"`).
- **Concurrency-save tests use the EF InMemory provider's concurrency-token check**
  (two contexts, same in-memory database) rather than a mock. Same harness existing
  handler tests use; no extra test infrastructure.
- **No DI registration.** Helpers are static — DI wiring would be ceremony for
  zero gain. Plan mentioned DI as optional; opted not.

## What iter-2/3 will need

- Migrate the 4 feature-level handlers (Title, Description, Lead, broad PATCH) to
  call `FeatureLoader.LoadWithStagePlansAsync` → `FeatureOwnershipGuard.EnsureManager`
  → `FeatureVersionGuard.EnsureFeatureVersion` → `FeatureConcurrencySaver.SaveFeatureAsync`.
- Migrate the 3 stage-level handlers (Owner, PlannedStart, PlannedEnd) similarly,
  swapping `SaveFeatureAsync` for `SaveStageAsync` and adding the
  `FeatureVersionGuard.EnsureStageVersion` call.
- Logging stays leaf-side for now (planner pinned the per-handler `LogInformation`
  shape; centralising it is a separate decision in iter-2).
