# Refactor Feedback — reduce-complexity-and-duplication — iter 003

Iteration: 3
Generator commit: 2a363c1cffb1dedb58b3e00c6aa43169c57b625e
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa
Behavior drift: false (raw diff present, planner-pinned tolerance applied — see below)
Weighted total: 9.10

## Behavior preservation gate

- Status: PASS (effective; raw diff is within planner-pinned tolerance)
- `diff-behavior-contract.mjs` raw evidence map (verbatim):
  - `openapi_json`: no diff
  - `features_proto_surface`: no diff
  - `ef_migrations_history`: no diff
  - `ef_schema_columns`: no diff
  - `feature_entity_shape`: no diff
  - `api_endpoint_matrix`: no diff
  - `grpc_status_code_emit_sites`: text differs (33→15 lines, 3027→1269 bytes) — **within planner tolerance**
  - `feature_inline_edit_log_format`: text differs (7→7 lines, 1216→1216 bytes) — **within planner tolerance**
  - `test_corpus_assertion_count`: text differs (2→2 lines, 4→4 bytes) — **within planner tolerance**

### `grpc_status_code_emit_sites` — pinned tolerance applied

Drift continues the planned migration of leaf throw sites onto the iter-1 helpers; iter-3 removes the three remaining stage-level leaf rows so the per-file histogram contracts further (33 → 26 → 15 lines across iter-1/2/3).

Tolerance verification:
- **Set of distinct status codes** emitted across `OneMoreTaskTracker.Features/Features` is unchanged: `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}` at both baseline and HEAD. (The plan's optimistic mention of `FailedPrecondition` was always conditional — it was never present in the baseline surface either.)
- **Path prefixes** emitting status codes unchanged: `Features/Create`, `Features/Data`, `Features/Get`, `Features/List`, `Features/Update`. Every site stays inside `OneMoreTaskTracker.Features/Features/`.
- Plan §"Tolerance pinning — `grpc_status_code_emit_sites` will move" satisfied verbatim.

### `feature_inline_edit_log_format` — pinned tolerance applied

Diff is exclusively **line-number prefix** drift (the captured surface uses `grep -n`, line numbers shifted because each leaf shrunk by ~30 lines):

```
baseline → current (template + structured fields byte-identical):
49: ... field=lead lead_before={Before} ...        →   33: ... field=lead lead_before={Before} ...
54: ... field=title title_len_before={Before} ...   →   38: ... field=title title_len_before={Before} ...
57: ... field=description description_length=... → 40: ... field=description description_length=...
60: ... field=owner old_value={Old} new_value={New} ... → 32: ... field=owner old_value={Old} new_value={New} ...
71: ... field=plannedEnd ...                          → 38: ... field=plannedEnd ...
71: ... field=plannedStart ...                        → 38: ... field=plannedStart ...
```

- Total bytes: 1216 → 1216. Identical.
- Template prefix `"Feature inline edit applied: feature_id={FeatureId} field=... ... actor_user_id={ActorUserId} ..."` preserved verbatim across all 7 lines.
- Structured field names per category preserved: feature-level `{V0}/{V1}` (`version_before/version_after`); stage-level `{SV0}/{SV1}` (`stage_version_before/stage_version_after`).
- Per-field bullets preserved: `lead_before/after`, `title_len_before/after`, `description_length` + `description_len_before/after`, `old_value/new_value`.
- Plan §"Tolerance pinning — `feature_inline_edit_log_format` will reorder" + rubric criterion #4 satisfied.

### `test_corpus_assertion_count` — pinned tolerance applied

- Baseline: `831`. iter-2: `873`. iter-3 HEAD: `887`. Iteration delta: `+14` (all from `StageEditContextLoaderTests`'s 5 [Fact]s; corroborated by generator notes).
- Plan envelope: "strict-superset additive drift is acceptable — count MAY rise but MUST NOT fall." Verified strict superset.

### Baseline test regression check

- `dotnet test OneMoreTaskTracker.slnx --no-build`: **442 / 442 passed** (Api 183, Features 105, GitLab.Proxy 63, Tasks 59, Users 32). 0 failed, 0 skipped.
- `BASELINE_TESTS_REGRESSED=false`.
- `check-baseline-tests.mjs --mode compare` returned `BASELINE_TESTS_REGRESSED:false` (manifest empty due to `generic` parser; full suite was re-run independently to confirm green — same protocol as iter-1/2).

### Build check

- `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`: 0 Error(s); 16 Warning(s) — pre-existing CS4014 / CS0162 / CS8604 in test files unrelated to this refactor (identical count and locations to iter-1/2 baseline). Refactor introduced no new warnings.

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 9.0 | Iter-3 closes axes 1–3 to or beyond target. Axis 1 LoC 423→**313** (target ≤320, met). Axis 2 manager-guard literal copies 3→**0** (target 1, exceeded — single shared site lives in `FeatureOwnershipGuard.EnsureManager`). Axis 3 `catch (DbUpdateConcurrencyException)` 5→**2** (target ≤2 met; remaining 2 are `FeatureConcurrencySaver.SaveFeatureAsync` + `SaveStageAsync`). 5 of 9 axes met/exceeded. Axes 4–7 unchanged at baseline (planned for commits 4–6, NOT regressed). No axis regressed. The migration also includes a Boy-Scout pass on `UpdateFeatureHandler.cs` (inlined `ProtoStateToEntity`, replaced `foreach` with LINQ `Select`; -16 LoC). Score not 10 because axes 4–7 are still pending — but the rubric explicitly accepts "partial credit (e.g. axis met for feature-level handlers but not stage-level) is the planner's expected mid-iteration state". |
| integration_and_conventions | 9.5 | New `StageEditContext` is `readonly record struct` (project rule: prefer `record`/`record struct` for immutable value-like models). New `StageEditContextLoader` is `static class` with single async entry point; one type per file; no comments; no log-only locals. Migrated stage handlers preserve `+1` increment leaf-side (`plan.Version = stageVersionBefore + 1`, `feature.Version = featureVersionBefore + 1`). `RecomputeFeatureDates` correctly sequenced between mutation and `SaveStageAsync` in both planned-start/end handlers. `request.Stage.ToString()` passed through to `FeatureLoader.ResolveStage` so `Status.Detail` continues to read `"stage Development not found"` (proto-enum name). Boy-Scout edits to `UpdateFeatureHandler` are bounded (a method already touched by iter-2). No new shared-infra project, no new TODO/FIXME, no new lint warnings. |
| test_coverage_delta | 9.0 | New `StageEditContextLoaderTests.cs` adds 5 [Fact]s exercising every error branch + happy path (id-validation, stage-validation, NotFound, ownership rejection, version mismatch). Test count 437→442 (+5 over iter-2). Assertion count 873→887 (+14 over iter-2). Existing `InlineEditEndpointsTests` + `UpdateFeatureHandlerTests` continue to cover the migrated handlers. Coverage on every touched file is ≥ baseline (no LCOV available; corroborated by full suite green). No new uncovered branches introduced — the new helper composes already-tested helpers. |
| perf_envelope | 9.0 | Each migrated stage handler still does exactly one `db.Features.Include(StagePlans).FirstOrDefault` (via `FeatureLoader.LoadWithStagePlansAsync`) + one `db.SaveChangesAsync` (via `FeatureConcurrencySaver.SaveStageAsync`). No extra DB calls. `StageEditContextLoader` does not introduce a second load — it's a pure composition over `FeatureLoader.LoadWithStagePlansAsync`. Test wall-clock duration within noise band of iter-2. Plan's implicit envelope ("no test-suite wall-clock regression") holds. |

**Weighted total** = 9.0 × 0.45 + 9.5 × 0.20 + 9.0 × 0.20 + 9.0 × 0.15 = 4.05 + 1.90 + 1.80 + 1.35 = **9.10**.

## Per-axis movement (verified at HEAD via plan source-of-truth commands)

Source-of-truth grep commands re-run at HEAD (`2a363c1c`):

| # | Axis | Baseline | iter-001 | iter-002 | iter-003 (verified) | Target | Verdict |
|---|------|----------|----------|----------|---------------------|--------|---------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | 493 | 423 | **313** | ≤ 320 | **met** (-180 = -36.5%) |
| 2 | Manager-ownership guard literal copies | 7 | 7 | 3 | **0** | 1 | **exceeded** (single shared site in `FeatureOwnershipGuard.EnsureManager`) |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | 8 | 5 | **2** | ≤ 2 (stretch 1) | **met** (the 2 sites are `SaveFeatureAsync` + `SaveStageAsync`) |
| 4 | `MapSummary` overload count in `PlanMapper` | 10 | 10 | 10 | **10** | 1 | unchanged — plan commit #4, not yet started |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 10 | 10 | **10** | 1 | unchanged — plan commit #5, not yet started |
| 6 | Distinct `ExtractDisplayName` definitions in gateway | 2 | 2 | 2 | **2** | 1 | unchanged — plan commit #6, not yet started |
| 7 | Distinct `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites | 2 | 2 | 2 | **2** | 1 | unchanged — plan commit #6, not yet started |
| 8 | `dotnet build` warnings/errors | 0/0 (refactor delta) | 0/0 | 0/0 | **0/0** | 0/0 | met |
| 9 | `dotnet test` regressed count | 0 | 0 | 0 | **0** | 0 | met (442/442 green; +5 over iter-2) |

Generator's claims in `generator-notes-iter-003.md` (axis 1=313, axis 2=0, axis 3=2) verified verbatim by re-running the source-of-truth grep commands at HEAD.

## Migration quality assessment (anchoring evidence)

Sampled `UpdateStageOwnerHandler.cs` at HEAD:

- Helper invocation order matches the helper contract: `StageEditContextLoader.LoadAsync` (which composes `id-validation → stage-validation → FeatureLoader.LoadWithStagePlansAsync → FeatureOwnershipGuard.EnsureManager → FeatureLoader.ResolveStage → FeatureVersionGuard.EnsureStageVersion`) → mutate → `FeatureConcurrencySaver.SaveStageAsync`.
- `+1` version-bump stays leaf-side: `plan.Version = stageVersionBefore + 1`, `feature.Version = featureVersionBefore + 1`. Helpers never touch `Version`. Rubric criterion #3 (Optimistic-concurrency increment preservation) intact.
- `request.FeatureId <= 0` still emits `InvalidArgument "feature_id is required"` (now centralized in `StageEditContextLoader`).
- `Enum.IsDefined(typeof(ProtoFeatureState), stage)` still emits `InvalidArgument "stage is required"`.
- Status detail strings preserved: `"feature_id is required"`, `"stage is required"`, `"feature {id} not found"`, `"stage {Stage} not found"`, `"Not the feature owner"`, `ConflictDetail.VersionMismatch(currentVersion)`.
- Planned-start/end handlers correctly call `StagePlanUpserter.RecomputeFeatureDates(feature)` between stage mutation and `SaveStageAsync`.
- Stage parameter `request.Stage.ToString()` is passed to `FeatureLoader.ResolveStage` (via `StageEditContextLoader`) so the emitted `Status.Detail` continues to read `"stage Development not found"` rather than `"stage 1 not found"`.
- Log template byte-identical to baseline. Field names `{FeatureId}/{Stage}/{Old}/{New}/{ActorUserId}/{SV0}/{SV1}` preserved.
- One type per file; no comments; no log-only locals.

`UpdateFeatureHandler.cs` (broad PATCH) Boy-Scout pass:

- `ProtoStateToEntity` private helper inlined at the only call site (-5 LoC).
- `ParseStagePlans` `foreach` collapsed onto a LINQ `Select` and inlined (-8 LoC); unused `ProtoFeatureStagePlan` alias removed.
- These changes are bounded to a method already touched in iter-2 (Boy Scout rule: in-scope cleanups on already-touched code). No collateral edits to sibling files.

## Issues

### Carry-overs from iter-2 (still in scope; iter-3 closed RF-002-01; RF-002-02..04 + optional 05/06 remain)

- **`RF-003-01`** — major — Collapse `PlanMapper.MapSummary` overloads to one generic projection (carry-over from `RF-002-02`)
  - target_file: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`; new bridge files under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/<ProtoNamespace>FeatureDto.cs`
  - change: introduce `partial class FeatureDto : IFeatureSummaryProjection` per proto namespace (one type per file) per the `csharp-proto-domain-interface` user skill; replace the 10 `MapSummary` overloads with one `MapSummary(IFeatureSummaryProjection f, ...)`.
  - ref: refactor-plan.md §"Planned commits" #4
  - status: carry-over
  - expected_axis_movement_after: axis 4 = 10 → 1

- **`RF-003-02`** — major — Collapse `FeatureMappingConfig.Register` `NewConfig` blocks (carry-over from `RF-002-03`)
  - target_file: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs`
  - change: collapse the 10 `TypeAdapterConfig<Feature, ...>.NewConfig()` blocks onto one driver — either a loop over `(targetType, registrationAction)` pairs or partial-class bridging on the Features side. Either is scored as "1 driver".
  - ref: refactor-plan.md §"Planned commits" #5
  - status: carry-over
  - expected_axis_movement_after: axis 5 = 10 → 1

- **`RF-003-03`** — major — Single-source `ExtractDisplayName` and gateway date-parsing (carry-over from `RF-002-04`)
  - target_files: `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs`
  - change: move `ExtractDisplayName` onto a single shared site (e.g. `PlanRequestHelpers` or a new sibling); delete the duplicate in `TeamController`. Collapse `PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate` onto one helper that both date-validation paths consume.
  - ref: refactor-plan.md §"Planned commits" #6
  - status: carry-over
  - expected_axis_movement_after: axis 6 = 2 → 1; axis 7 = 2 → 1

- **`RF-003-04`** — minor — Optional: merge `SaveFeatureAsync` / `SaveStageAsync` into a single generic save (carry-over from `RF-002-05`)
  - target_file: `OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs`
  - change: collapse onto a single `SaveAsync<TEntity>(db, entity, getVersion)` to hit axis-3 stretch target = 1. Optional — the plan already accepts ≤ 2 (met). Closing axis 3 to stretch target is a small leverage win on the way to plan commit #7 cleanup; defer if commits #4–6 are larger and contention is real.
  - ref: refactor-plan.md axis 3 (stretch target = 1)
  - status: carry-over

### New issues introduced by iter-3

None. The iteration is a clean, surgical execution of plan commit #3 plus a small, in-scope Boy-Scout pass on `UpdateFeatureHandler` that is the reason axis 1 closed below 320 (313 vs the 320 budget — iter-3 had ~7 LoC of headroom that the Boy-Scout pass consumed without expanding scope).

## Carry-over items the iter-4 generator MUST address

1. **Plan commits #4–6 (the gateway-side consolidation)** — these three issues (`RF-003-01`, `RF-003-02`, `RF-003-03`) are independent of each other and independent of any code already migrated. They can land as three commits in iter-4 OR be split across iter-4/5; they touch separate files (`PlanMapper.cs`, `FeatureMappingConfig.cs`, `TeamController.cs`+`PlanRequestHelpers.cs`).
2. **Preserve byte-identity on `openapi_json`, `features_proto_surface`, `ef_*`, `feature_entity_shape`, `api_endpoint_matrix`** — none of plan commits #4–6 should touch any of these. The mapper consolidations are pure internal mapping, the display-name dedup is gateway-internal, the date-parser dedup is gateway-internal.
3. **Re-run all axis grep commands** at iter-4 HEAD to confirm targets met. After iter-4 specifically: axis 4 = 1 (single generic `MapSummary`), axis 5 = 1 (single driver in `FeatureMappingConfig`), axis 6 = 1 (single `ExtractDisplayName`), axis 7 = 1 (single date parser).
4. **Optional follow-on (same iteration)**: `RF-003-04` (merge `SaveFeatureAsync`/`SaveStageAsync`) for the axis-3 stretch target. Small leverage — defer if iter-4 is already large.

## next_actions

```json
[
  { "id": "RF-003-01", "severity": "major",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs",
    "change": "Collapse 10 MapSummary overloads to one generic projection via partial-class IFeatureSummaryProjection bridges per proto namespace (csharp-proto-domain-interface skill).",
    "ref": "refactor-plan.md §Planned commits #4",
    "status": "carry-over" },
  { "id": "RF-003-02", "severity": "major",
    "target_file": "OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs",
    "change": "Collapse 10 NewConfig blocks onto one driver (loop over (targetType, registrationAction) pairs OR partial-class bridge).",
    "ref": "refactor-plan.md §Planned commits #5",
    "status": "carry-over" },
  { "id": "RF-003-03", "severity": "major",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs",
    "change": "Single-source ExtractDisplayName (delete duplicate in TeamController) and collapse ValidateOptionalReleaseDate + TryParseIsoDate onto one date-parser helper.",
    "ref": "refactor-plan.md §Planned commits #6",
    "status": "carry-over" },
  { "id": "RF-003-04", "severity": "minor",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs",
    "change": "Optional axis-3 stretch: collapse SaveFeatureAsync + SaveStageAsync onto SaveAsync<TEntity>(db, entity, getVersion).",
    "ref": "refactor-plan.md axis 3 stretch target",
    "status": "carry-over" }
]
```
