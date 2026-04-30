# Refactor Feedback — reduce-complexity-and-duplication — iter 002

Iteration: 2
Generator commit: 140c9b4524114f39c5c62bcc8c7dd20efafc1a95
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa
Behavior drift: false (raw diff present, planner-pinned tolerance applied — see below)
Weighted total: 8.45

## Behavior preservation gate

- Status: PASS (effective; raw diff is within planner-pinned tolerance)
- `diff-behavior-contract.mjs` raw evidence map (verbatim):
  - `openapi_json`: no diff
  - `features_proto_surface`: no diff
  - `ef_migrations_history`: no diff
  - `ef_schema_columns`: no diff
  - `feature_entity_shape`: no diff
  - `api_endpoint_matrix`: no diff
  - `grpc_status_code_emit_sites`: text differs (33→26 lines, 3027→2339 bytes) — **within planner tolerance**
  - `feature_inline_edit_log_format`: text differs (7→7 lines, 1216→1216 bytes) — **within planner tolerance**
  - `test_corpus_assertion_count`: text differs (2→2 lines, 4→4 bytes) — **within planner tolerance**

### `grpc_status_code_emit_sites` — pinned tolerance applied

Drift is the planned migration of leaf throw sites into the iter-1 helpers. Net change: 4 leaf rows removed, 4 helper rows added (net -7 lines because some leafs collapsed onto one row instead of multiple).

Removed (leaf-level):
```
-    2 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureDescriptionHandler.cs :: AlreadyExists
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureDescriptionHandler.cs :: NotFound
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureDescriptionHandler.cs :: PermissionDenied
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs :: NotFound
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs :: PermissionDenied
-    2 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureLeadHandler.cs :: AlreadyExists
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureLeadHandler.cs :: NotFound
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureLeadHandler.cs :: PermissionDenied
-    2 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs :: AlreadyExists
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs :: NotFound
-    1 OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs :: PermissionDenied
```

Added (helper-level — same subtree):
```
+    2 OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs :: AlreadyExists
+    2 OneMoreTaskTracker.Features/Features/Update/FeatureLoader.cs :: NotFound
+    1 OneMoreTaskTracker.Features/Features/Update/FeatureOwnershipGuard.cs :: PermissionDenied
+    2 OneMoreTaskTracker.Features/Features/Update/FeatureVersionGuard.cs :: AlreadyExists
```

Tolerance verification:
- Set of distinct status codes emitted across `OneMoreTaskTracker.Features/Features` is unchanged: `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}` at both baseline and HEAD. (`FailedPrecondition` listed in plan as planned-future is still absent at HEAD — same as baseline.)
- All emission sites stay inside `OneMoreTaskTracker.Features/Features/` — no emission moved out of the planner-pinned subtree.
- Plan §"Tolerance pinning — `grpc_status_code_emit_sites` will move" is satisfied verbatim.

### `feature_inline_edit_log_format` — pinned tolerance applied

Diff is exclusively **line-number prefix** drift in the captured surface (not template-text drift):

```
-49: "Feature inline edit applied: feature_id={FeatureId} field=lead lead_before=..."
-54: "Feature inline edit applied: feature_id={FeatureId} field=title title_len_before=..."
-57: "Feature inline edit applied: feature_id={FeatureId} field=description description_length=..."
+33: "Feature inline edit applied: feature_id={FeatureId} field=lead lead_before=..."
+38: "Feature inline edit applied: feature_id={FeatureId} field=title title_len_before=..."
+40: "Feature inline edit applied: feature_id={FeatureId} field=description description_length=..."
```

The line numbers shifted because the leaf handlers shrunk (LoC fell from 61→45, 64→47, 56→40). The template prefix (`"Feature inline edit applied: feature_id={FeatureId} field=..."`), every structured field name (`{FeatureId}`, `{Before}`, `{After}`, `{ActorUserId}`, `{V0}`, `{V1}`, `{DescriptionLength}`), and the per-field bullets (`title_len_before/after`, `lead_before/after`, `description_length`, `description_len_before/after`) are byte-identical. Plan §"Tolerance pinning — `feature_inline_edit_log_format` will reorder" + rubric criterion #4 are satisfied.

### `test_corpus_assertion_count` — pinned tolerance applied

- Baseline: `831`. HEAD: `873`. Delta: `+42`. Iteration delta: 0 (all 42 added in iter-1). Plan envelope: "strict-superset additive drift is acceptable — count MAY rise but MUST NOT fall." Verified: zero `tests/**` files were modified between iter-1 and iter-2 HEAD; the +42 carried over unchanged.

### Baseline test regression check

- `dotnet test OneMoreTaskTracker.slnx`: **437 / 437 passed** (Api 183, Features 100, GitLab.Proxy 63, Tasks 59, Users 32). 0 failed, 0 skipped.
- `BASELINE_TESTS_REGRESSED=false`.
- `check-baseline-tests.mjs --mode compare` returned `BASELINE_TESTS_REGRESSED:false` (manifest empty due to `generic` parser; full suite was re-run independently to confirm green — same as iter-1).

### Build check

- `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`: **Build succeeded. 0 Warning(s), 0 Error(s)**.

## Scored criteria

| Criterion | Score (0–10) | Notes |
|-----------|--------------|-------|
| code_quality_delta | 8.0 | First iteration where MUST-improve axes actually shifted: axis 1 (LoC) 493→423 (40% of the way), axis 2 (manager-guard literal copies) 7→3 (67% of the way), axis 3 (concurrency catches) 8→5 (rebalanced as helpers absorbed leaf catches). Axes 4–7 unchanged (planned for iter-3+ per plan §"Planned commits" #4–6). No axis regressed. Per prompt: reward the metric movement. |
| integration_and_conventions | 9.0 | All migrated handlers use the iter-1 helpers without introducing new utilities; status detail strings byte-identical; log templates byte-identical; +1 version-bump preserved leaf-side; one type per file; no new TODO/FIXME; imports stay within `OneMoreTaskTracker.Features/Features/Update/`. The Boy-Scout removal of three comment blocks in `UpdateFeatureHandler.cs` (referencing `spec 03 §170`, `api-contract.md v1`, `microservices/security.md`) aligns with the project rule "minimize comments — never reference task IDs / spec sections / contract paths in code". |
| test_coverage_delta | 8.5 | No new test files added in iter-2 (the 18 [Fact]s landed in iter-1 and continue to cover all helper paths). Test corpus 873 stable. Migrated handlers retain pre-existing `InlineEditEndpointsTests` + `UpdateFeatureHandlerTests` coverage; the four helpers retain their own iter-1 dedicated tests. Coverage on every touched file is at least baseline; no new uncovered branches introduced (helpers were already covered). |
| perf_envelope | 9.0 | Each migrated handler still does exactly one `db.Features.Include(StagePlans).FirstOrDefault` (now via `FeatureLoader.LoadWithStagePlansAsync`) + one `db.SaveChangesAsync` (now via `FeatureConcurrencySaver.SaveFeatureAsync`). No extra DB calls. Test wall-clock unchanged within noise. The plan's implicit envelope ("no test-suite wall-clock regression") holds. |

**Weighted total** = 8.0 × 0.45 + 9.0 × 0.20 + 8.5 × 0.20 + 9.0 × 0.15 = 3.60 + 1.80 + 1.70 + 1.35 = **8.45**.

## Per-axis movement (verified at HEAD)

Source-of-truth grep commands run at HEAD (`140c9b45`) per `refactor-plan.md` axis table:

| # | Axis | Baseline | iter-001 | iter-002 (verified) | Target | Verdict |
|---|------|----------|----------|---------------------|--------|---------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | 493 | **423** | ≤ 320 | partial — 40% of the gap closed; iter-3 stage-level migration closes the rest |
| 2 | Manager-ownership guard literal copies | 7 | 7 | **3** | 1 | partial — 4 leaf copies removed; remaining 3 = stage-level handlers (iter-3) |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | 8 | **5** | ≤ 2 (stretch 1) | partial — 3 leaf catches removed; remaining 5 = 3 stage-level + 2 helpers (`SaveFeatureAsync`/`SaveStageAsync`) |
| 4 | `MapSummary` overload count in `PlanMapper` | 10 | 10 | **10** | 1 | unchanged — plan commit #4, not yet started |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 10 | **10** | 1 | unchanged — plan commit #5, not yet started |
| 6 | Distinct `ExtractDisplayName` definitions in gateway | 2 | 2 | **2** | 1 | unchanged — plan commit #6, not yet started |
| 7 | Distinct `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites | 2 | 2 | **2** | 1 | unchanged — plan commit #6, not yet started |
| 8 | `dotnet build` warnings/errors | 0/0 | 0/0 | **0/0** | 0/0 | met |
| 9 | `dotnet test` regressed count | 0 | 0 | **0** | 0 | met (437/437 green) |

Generator's claims in `generator-notes-iter-002.md` (axis 1=423, axis 2=3, axis 3=5) verified verbatim by re-running the source-of-truth grep commands at HEAD.

## Migration quality assessment (anchoring evidence)

Sampled `UpdateFeatureTitleHandler.cs` at HEAD:

- Helper invocation order matches the helper contract: `FeatureLoader.LoadWithStagePlansAsync` → `FeatureOwnershipGuard.EnsureManager` → `FeatureVersionGuard.EnsureFeatureVersion` → mutate → `FeatureConcurrencySaver.SaveFeatureAsync`.
- `+1` version-bump stays leaf-side (`feature.Version = versionBefore + 1;`) — helpers never touch `Version`. Rubric criterion #3 (Optimistic-concurrency increment preservation) intact.
- `request.Id <= 0` still emits `InvalidArgument "id is required"` (leaf-side, before load).
- Field-level validation (`trimmedTitle.Length == 0`, `> TitleMaxLength`) still runs leaf-side before load.
- Status detail strings preserved: `"id is required"`, `"title is required"`, `"title too long"` (leaf); `"feature {id} not found"` (helper); `"Not the feature owner"` (helper); `ConflictDetail.VersionMismatch(currentVersion)` (helper).
- Log template: byte-identical to baseline. Field names `{FeatureId}/{Before}/{After}/{ActorUserId}/{V0}/{V1}` preserved.
- One type per file; no comments; no log-only locals.

`UpdateFeatureHandler.cs` (broad PATCH) note: it has no `expectedVersion` path, so it uses `FeatureLoader` + `FeatureOwnershipGuard` only and keeps its raw `db.SaveChangesAsync` (no `FeatureConcurrencySaver`). This is correct — the broad-PATCH path does not bump `Feature.Version`, only stage-level versions when stages are touched, and there is no concurrent-save retry contract on it. Generator's note "the +=2 / batching anti-pattern is therefore not reachable" is accurate.

## Issues

### Carry-overs from iter-1 (still in scope, planned for iter-3+)

- **`RF-002-01`** — major — Migrate the 3 stage-level inline-edit handlers onto the helpers
  - target_files: `OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs`, `UpdateStagePlannedStartHandler.cs`, `UpdateStagePlannedEndHandler.cs`
  - change: replace inline `Include(StagePlans).FirstOrDefault → CallerUserId guard → version check → SaveChanges/catch` with `FeatureLoader.LoadWithStagePlansAsync → FeatureLoader.ResolveStage(feature, (int)request.Stage, request.Stage.ToString()) → FeatureOwnershipGuard.EnsureManager → FeatureVersionGuard.EnsureStageVersion → FeatureConcurrencySaver.SaveStageAsync`. Preserve `RecomputeFeatureDates` step. Pass `request.Stage.ToString()` to `ResolveStage` to keep baseline error text.
  - ref: refactor-plan.md §"Planned commits" #3
  - status: carry-over from `RF-001-02` (renamed for iter-2)
  - expected_axis_movement_after: axis 1 = 423 → ≤ 320; axis 2 = 3 → 1; axis 3 = 5 → 2 (or 1 if `RF-002-05` lands)

- **`RF-002-02`** — major — Collapse `PlanMapper.MapSummary` overloads to one generic projection
  - target_file: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`; new bridge files under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/`
  - change: introduce `partial class FeatureDto : IFeatureSummaryProjection` per proto namespace (one type per file) per the `csharp-proto-domain-interface` user skill; replace the 10 `MapSummary` overloads with one `MapSummary(IFeatureSummaryProjection f, …)`.
  - ref: refactor-plan.md §"Planned commits" #4
  - status: carry-over from `RF-001-03`
  - expected_axis_movement_after: axis 4 = 10 → 1

- **`RF-002-03`** — major — Collapse `FeatureMappingConfig` `NewConfig` blocks
  - target_file: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs`
  - change: collapse the 10 `TypeAdapterConfig<Feature, …>.NewConfig()` blocks onto one driver — either a loop over `(targetType, registrationAction)` pairs or partial-class bridging on the Features side.
  - ref: refactor-plan.md §"Planned commits" #5
  - status: carry-over from `RF-001-04`
  - expected_axis_movement_after: axis 5 = 10 → 1

- **`RF-002-04`** — major — Single-source `ExtractDisplayName` and gateway date-parsing
  - target_files: `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs`
  - change: move `ExtractDisplayName` onto a single shared site; delete the duplicate in `TeamController`. Collapse `PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate` onto one helper that both date-validation paths consume.
  - ref: refactor-plan.md §"Planned commits" #6
  - status: carry-over from `RF-001-05`
  - expected_axis_movement_after: axis 6 = 2 → 1; axis 7 = 2 → 1

- **`RF-002-05`** — minor — Optional: merge `SaveFeatureAsync` / `SaveStageAsync` into a single generic save (axis-3 stretch target)
  - target_file: `OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs`
  - change: collapse onto a single `SaveAsync<TEntity>(db, entity, getVersion)` to hit axis-3 stretch target = 1 after stage-level migration. Optional — the plan accepts ≤ 2.
  - ref: refactor-plan.md axis 3 (stretch target = 1)
  - status: carry-over from `RF-001-06`

- **`RF-002-06`** — minor — Optional: keep leaf-side logging or centralise per template-prefix preservation
  - target_file: leaf handlers + (optionally) shared scaffolding
  - change: the iter-2 generator chose to keep `LogInformation` leaf-side, which preserved log-format parity perfectly. If a later iteration centralises the emit, preserve the template prefix `"Feature inline edit applied: feature_id={FeatureId} field=... ..."` and per-category structured field names.
  - ref: refactor-plan.md §"Tolerance pinning — `feature_inline_edit_log_format` will reorder"
  - status: carry-over from `RF-001-07`

### New issues introduced by iter-2

None. The iteration is a clean, surgical execution of plan commit #2.

## Carry-over items the iter-3 generator MUST address

1. **Migrate the 3 stage-level handlers** (`UpdateStageOwnerHandler`, `UpdateStagePlannedStartHandler`, `UpdateStagePlannedEndHandler`) onto `FeatureLoader.ResolveStage` + `FeatureOwnershipGuard` + `FeatureVersionGuard.EnsureStageVersion` + `FeatureConcurrencySaver.SaveStageAsync`. This closes axes 1–3 to within target.
2. **Preserve baseline error text on stage-not-found**: pass `request.Stage.ToString()` (not `(int)request.Stage`) into `FeatureLoader.ResolveStage` so the emitted `Status.Detail` continues to include the proto-enum name rather than its numeric value.
3. **Preserve `RecomputeFeatureDates`** sequence in stage-level handlers — the helper does not do this; leaf handlers must continue to call it after the mutation but before `FeatureConcurrencySaver.SaveStageAsync`.
4. **Optimistic-concurrency invariant**: `FeatureStagePlan.Version = versionBefore + 1` continues to bump leaf-side. Helpers never touch `Version`.
5. **Re-run all axis grep commands** at iter-3 HEAD to confirm targets met. Specifically: axis 1 ≤ 320 (LoC), axis 2 = 1 (single shared site for the manager-guard expression), axis 3 ≤ 2.
6. **Optional follow-on (same iteration)**: kick off plan commits #4–6 (the gateway-side mapper consolidation + display-name + date-parser dedup). These are independent of the stage-level migration and can land in the same iteration without contention.

## next_actions

```json
[
  { "id": "RF-002-01", "severity": "major",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs",
    "change": "Migrate stage-level handlers onto FeatureLoader/ResolveStage/Guard/Saver. Pass request.Stage.ToString() to preserve baseline error text. Preserve RecomputeFeatureDates step.",
    "ref": "refactor-plan.md §Planned commits #3",
    "status": "carry-over" },
  { "id": "RF-002-02", "severity": "major",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs",
    "change": "Collapse 10 MapSummary overloads to one generic projection via partial-class IFeatureSummaryProjection bridges per proto namespace.",
    "ref": "refactor-plan.md §Planned commits #4",
    "status": "carry-over" },
  { "id": "RF-002-03", "severity": "major",
    "target_file": "OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs",
    "change": "Collapse 10 NewConfig blocks onto one driver (loop or partial-class bridge).",
    "ref": "refactor-plan.md §Planned commits #5",
    "status": "carry-over" },
  { "id": "RF-002-04", "severity": "major",
    "target_file": "OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs",
    "change": "Single-source ExtractDisplayName + collapse ValidateOptionalReleaseDate / TryParseIsoDate onto one helper.",
    "ref": "refactor-plan.md §Planned commits #6",
    "status": "carry-over" },
  { "id": "RF-002-05", "severity": "minor",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/FeatureConcurrencySaver.cs",
    "change": "Optional: merge SaveFeatureAsync/SaveStageAsync into one generic save to hit axis-3 stretch target of 1.",
    "ref": "refactor-plan.md axis 3 stretch target",
    "status": "carry-over" },
  { "id": "RF-002-06", "severity": "minor",
    "target_file": "OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs",
    "change": "Optional: keep LogInformation leaf-side (current choice preserves byte-parity); if centralised later, preserve template prefix + per-category field names.",
    "ref": "refactor-plan.md §Tolerance pinning — feature_inline_edit_log_format will reorder",
    "status": "carry-over" }
]
```
