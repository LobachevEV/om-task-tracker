# Refactor Feedback — reduce-complexity-and-duplication — iter 001

Iteration: 1
Generator commit: 00ec1a50e29d1e1826cb7036aa614f9ea3835914
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa
Behavior drift: false (raw diff present, planner-pinned tolerance applied — see below)
Weighted total: 8.225

## Behavior preservation gate

- Status: PASS (effective; raw diff is within planner-pinned tolerance)
- Diff summary (verbatim from `diff-behavior-contract.mjs`):
  - `openapi_json`: no diff
  - `features_proto_surface`: no diff
  - `ef_migrations_history`: no diff
  - `ef_schema_columns`: no diff
  - `feature_entity_shape`: no diff
  - `api_endpoint_matrix`: no diff
  - `feature_inline_edit_log_format`: no diff
  - `grpc_status_code_emit_sites`: text differs (33→37 lines, 3027→3381 bytes) — **within planner tolerance**
  - `test_corpus_assertion_count`: text differs (831 → 873, +42) — **within planner tolerance**

### `grpc_status_code_emit_sites` — pinned tolerance applied

Drift is purely additive (4 new lines, 0 removed):

```
+    1 OneMoreTaskTracker.Features/Features/Update/FeatureOwnershipGuard.cs    :: PermissionDenied
+    2 OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs  :: AlreadyExists
+    2 OneMoreTaskTracker.Features/Features/Update/FeatureLoader.cs            :: NotFound
+    2 OneMoreTaskTracker.Features/Features/Update/FeatureVersionGuard.cs      :: AlreadyExists
```

- Set of distinct status codes emitted across `OneMoreTaskTracker.Features/Features` is unchanged: `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}` at both baseline and HEAD. (`FailedPrecondition` listed as planned-future in `refactor-plan.md` is still absent at iter-1 — same as baseline; no class change.)
- All 4 new emission sites live inside `OneMoreTaskTracker.Features/Features/Update/` (no emission moved out of the planner-pinned subtree).
- Plan section "Tolerance pinning — `grpc_status_code_emit_sites` will move" is satisfied verbatim.

### `test_corpus_assertion_count` — pinned tolerance applied

- Baseline: `831`. HEAD: `873`. Delta: `+42` (18 new `[Fact]`s × ~2.3 assertions each).
- Plan envelope: "strict-superset additive drift is acceptable — count MAY rise but MUST NOT fall. No existing assertion may be deleted or reworded." Verified: zero `tests/**` files were modified at HEAD; only `tests/.../Features/Update/Feature{OwnershipGuard,VersionGuard,Loader,ConcurrencySaver}Tests.cs` were added.

### Baseline test regression check

- `dotnet test OneMoreTaskTracker.slnx`: **437 / 437 passed** (Api 183, Features 100, GitLab.Proxy 63, Tasks 59, Users 32). 0 failed, 0 skipped.
- `BASELINE_TESTS_REGRESSED=false`.
- `check-baseline-tests.mjs --mode compare` returned `BASELINE_TESTS_REGRESSED:false` (manifest empty due to `generic` parser; full suite was re-run independently to confirm green).

### Build check

- `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`: **Build succeeded. 0 Warning(s), 0 Error(s)**.

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 7.5 | Iter-1 scaffolding-only; 4 helpers landed for axes 1–3 with faithful error strings + StatusCodes; no scaffolding yet for axes 4–7. Per prompt: do NOT penalize iter-1 for not migrating. |
| integration_and_conventions | 9.0 | All helpers in planner-allowed `Features/Update/`; one type per file; `public static` matches sibling style; tests mirror source structure; no new TODO/FIXME; no shared-infra project introduced. |
| test_coverage_delta | 8.5 | 18 new `[Fact]`s across 4 new test files; assertion count 831→873 (additive only); coverage on every new helper file is ≥90% (small files, 13/19/25/40 LoC, each fully exercised). |
| perf_envelope | 9.0 | No call-site change → zero runtime impact; helpers add no DB calls; test wall-clock unchanged within noise. |

**Weighted total** = 7.5 × 0.45 + 9.0 × 0.20 + 8.5 × 0.20 + 9.0 × 0.15 = 3.375 + 1.80 + 1.70 + 1.35 = **8.225**.

## Per-axis movement (from `refactor-plan.md`)

Iter-1 is sliced as "scaffolding only — no call-site migration". Plan §"Planned commits" #1; generator-notes-iter-001.md "MUST-improve axes touched". Axis numbers are NOT expected to move yet.

| # | Axis | Baseline | Target | Current | Verdict |
|---|------|----------|--------|---------|---------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | ≤ 320 | 493 | unchanged (expected — call-site migration is iter-2/3) |
| 2 | Manager-ownership guard literal copies | 7 | 1 | 7 | unchanged (canonical site exists in `FeatureOwnershipGuard`; iter-2 collapses callers) |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | ≤ 2 (stretch 1) | 8 | apparent +2 (helper added 2 catches; pre-existing 6 unchanged). After iter-2/3 leaves call helper, count drops to 2 (matches target). NOT scored as regression — see iter-1 caveat. |
| 4 | `MapSummary` overload count in `PlanMapper` | 10 | 1 | 10 | unchanged (commit #4 in plan — not iter-1) |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 1 | 10 | unchanged (commit #5 in plan — not iter-1) |
| 6 | Distinct `ExtractDisplayName` definitions in gateway | 2 | 1 | 2 | unchanged (commit #6 in plan — not iter-1) |
| 7 | Distinct `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites | 2 | 1 | 2 | unchanged (commit #6 in plan — not iter-1) |
| 8 | `dotnet build` warnings/errors | 0/0 | 0/0 | 0/0 | met |
| 9 | `dotnet test` regressed count | 0 | 0 | 0 | met (437/437 green) |

## Scaffolding-quality assessment (iter-1 score-anchoring evidence)

- **`FeatureOwnershipGuard.EnsureManager`** — emits `PermissionDenied` with the literal text `"Not the feature owner"`. Matches the seven existing leaf sites byte-for-byte. Rubric criterion #6 ("`request.CallerUserId <= 0` continues to map to `PermissionDenied`") is preserved.
- **`FeatureVersionGuard.EnsureFeatureVersion` + `EnsureStageVersion`** — emit `AlreadyExists` with `ConflictDetail.VersionMismatch(currentVersion)`. Matches the existing `If-Match` mismatch envelope used by `GrpcExceptionMiddleware` to produce 409 responses.
- **`FeatureLoader.LoadWithStagePlansAsync`** — emits `NotFound` with `"feature {id} not found"`. **`ResolveStage`** — emits `NotFound` with `"stage {stageDisplay} not found"` (parameter is `string`, allowing leaves to pass `request.Stage.ToString()` to preserve baseline error text).
- **`FeatureConcurrencySaver.SaveFeatureAsync` / `SaveStageAsync`** — preserves the existing pattern (`SaveChangesAsync` → on `DbUpdateConcurrencyException`, `Entry(x).ReloadAsync` → throw `AlreadyExists` with `ConflictDetail.VersionMismatch(currentVersion)`). Note: the +1 increment semantics live in the leaf handlers' mutations, not the saver — preserved through iter-2/3 by NOT changing how leaves bump `Version`.
- **No DI registration.** Static helpers, no `IServiceCollection` ceremony. Plan called this "optional"; choice is sound.
- **Why four helpers, not one god-helper.** Plan permitted either; one-type-per-file is the hard constraint. Four small static helpers compose at iter-2 call sites more readably than one helper with five static methods on unrelated concerns.

## Issues

All issues below are carry-overs into iter-2 (no defects in iter-1 — these are the planned next steps).

- **`RF-001-01`** — major — Migrate the 4 feature-level inline-edit handlers onto the new helpers
  - target_files: `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs`, `UpdateFeatureDescriptionHandler.cs`, `UpdateFeatureLeadHandler.cs`, `UpdateFeatureHandler.cs`
  - change: replace inline `Include(StagePlans).FirstOrDefault → CallerUserId guard → version check → SaveChanges/catch` with `FeatureLoader.LoadWithStagePlansAsync → FeatureOwnershipGuard.EnsureManager → FeatureVersionGuard.EnsureFeatureVersion → FeatureConcurrencySaver.SaveFeatureAsync`. Keep the leaf's "what to mutate + what to log" delegate inline.
  - ref: refactor-plan.md §"Planned commits" #2
  - status: new

- **`RF-001-02`** — major — Migrate the 3 stage-level inline-edit handlers onto the new helpers
  - target_files: `OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs`, `UpdateStagePlannedStartHandler.cs`, `UpdateStagePlannedEndHandler.cs`
  - change: load via `FeatureLoader.LoadWithStagePlansAsync` + `FeatureLoader.ResolveStage(feature, (int)request.Stage, request.Stage.ToString())` (passing the proto enum's `ToString()` preserves baseline error text); auth via `FeatureOwnershipGuard.EnsureManager`; version via `FeatureVersionGuard.EnsureStageVersion`; save via `FeatureConcurrencySaver.SaveStageAsync`. Preserve the `RecomputeFeatureDates` step.
  - ref: refactor-plan.md §"Planned commits" #3
  - status: new

- **`RF-001-03`** — major — Collapse `PlanMapper.MapSummary` overloads to one generic projection
  - target_file: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`; new bridge files under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/`
  - change: introduce `partial class FeatureDto : IFeatureSummaryProjection` per proto namespace (one type per file) per the `csharp-proto-domain-interface` user skill; replace the 10 `MapSummary` overloads with one `MapSummary(IFeatureSummaryProjection f, …)`. Donate `ExtractDisplayName` along the same path.
  - ref: refactor-plan.md §"Planned commits" #4
  - status: new

- **`RF-001-04`** — major — Collapse `FeatureMappingConfig` `NewConfig` blocks
  - target_file: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs`
  - change: collapse the 10 `TypeAdapterConfig<Feature, …>.NewConfig()` blocks onto one driver — either a loop over `(targetType, registrationAction)` pairs or partial-class bridging on the Features side. Either is acceptable per the plan.
  - ref: refactor-plan.md §"Planned commits" #5
  - status: new

- **`RF-001-05`** — major — Single-source `ExtractDisplayName` and gateway date-parsing
  - target_files: `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs`
  - change: move `ExtractDisplayName` onto a single shared site (e.g. `PlanRequestHelpers.ExtractDisplayName` or a new sibling); delete the duplicate in `TeamController`. Collapse `PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate` onto one helper that both date-validation paths consume.
  - ref: refactor-plan.md §"Planned commits" #6
  - status: new

- **`RF-001-06`** — minor — Consider merging `SaveFeatureAsync` / `SaveStageAsync` into a single generic save
  - target_file: `OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs`
  - change: the two methods are byte-identical except for `Feature` vs `FeatureStagePlan` and the `Version` accessor. After iter-2/3 migrates leaf catches, axis 3 will land at 2 (one per helper method). The plan's stretch target is 1; merging onto a single `SaveAsync<TEntity>(db, entity, getVersion)` would hit the stretch target. Optional — the plan accepts ≤ 2.
  - ref: refactor-plan.md axis 3 (stretch target = 1)
  - status: new

- **`RF-001-07`** — minor — After iter-2/3, drop the leaf-level `LogInformation("Feature inline edit applied: …")` to a single shared emit if/when that decision is made
  - target_file: shared scaffolding (TBD location)
  - change: optional. Plan §"Tolerance pinning — `feature_inline_edit_log_format` will reorder" pins the template prefix + structured field names. If the migration in iter-2/3 chooses to keep logging leaf-side (as generator-notes-iter-001.md hints at), this issue goes away. Recommended: keep leaf-side until/unless the leaf-only contribution drops to a single field-specific line — at that point a helper-side emit becomes natural.
  - ref: refactor-plan.md §"Tolerance pinning — `feature_inline_edit_log_format` will reorder"
  - status: new

## Carry-over items the iter-2 generator MUST address

1. **Migrate at least one feature-level handler** (`UpdateFeatureTitleHandler` is the smallest, lowest-risk choice) onto the four helpers in iter-2 — this is the first point at which axis 1 (LoC) and axis 2 (manager-guard literal copies) start moving. Without at least one migration in iter-2, the harness will plateau at iter-1 numbers.
2. **Re-run the must-improve grep commands** at iter-2 HEAD and verify each migrated handler removes the inline `request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId` and the inline `catch (DbUpdateConcurrencyException)`. The axis-3 raw count target is 8 → 6 after migrating one feature-level handler (helper still has 2; one leaf catches collapses), and so on through iter-3.
3. **Preserve `+1` version-bump semantics.** Rubric criterion #3 ("Optimistic-concurrency increment preservation") is iter-2-critical, not iter-1. Existing tests `InlineEditEndpointsTests` + `UpdateFeatureHandlerTests` guard this — if they go red in iter-2, that's an auto-fail trigger.
4. **Preserve log-shape parity.** Rubric criterion #4 — template prefix + structured field names. If iter-2 starts touching `LogInformation` calls, re-capture `feature_inline_edit_log_format` and confirm field-name preservation per category.

## next_actions

```json
[
  { "id": "RF-001-01", "severity": "major",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs",
    "change": "Migrate to FeatureLoader/Guard/Saver helpers; keep leaf logging.",
    "ref": "refactor-plan.md §Planned commits #2",
    "status": "new" },
  { "id": "RF-001-02", "severity": "major",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs",
    "change": "Migrate stage-level handlers; pass request.Stage.ToString() to ResolveStage to preserve error text.",
    "ref": "refactor-plan.md §Planned commits #3",
    "status": "new" },
  { "id": "RF-001-03", "severity": "major",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs",
    "change": "Collapse 10 MapSummary overloads to one generic projection via partial-class IFeatureSummaryProjection bridges.",
    "ref": "refactor-plan.md §Planned commits #4",
    "status": "new" },
  { "id": "RF-001-04", "severity": "major",
    "target_file": "OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs",
    "change": "Collapse 10 NewConfig blocks onto one driver (loop or partial-class bridge).",
    "ref": "refactor-plan.md §Planned commits #5",
    "status": "new" },
  { "id": "RF-001-05", "severity": "major",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs",
    "change": "Single-source ExtractDisplayName + collapse ValidateOptionalReleaseDate / TryParseIsoDate onto one helper.",
    "ref": "refactor-plan.md §Planned commits #6",
    "status": "new" },
  { "id": "RF-001-06", "severity": "minor",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs",
    "change": "Optional: merge SaveFeatureAsync/SaveStageAsync into one generic save to hit axis-3 stretch target of 1.",
    "ref": "refactor-plan.md axis 3 stretch target",
    "status": "new" },
  { "id": "RF-001-07", "severity": "minor",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs",
    "change": "Optional: keep LogInformation leaf-side; if centralised in a later commit, preserve template prefix + per-category field names.",
    "ref": "refactor-plan.md §Tolerance pinning — feature_inline_edit_log_format will reorder",
    "status": "new" }
]
```
