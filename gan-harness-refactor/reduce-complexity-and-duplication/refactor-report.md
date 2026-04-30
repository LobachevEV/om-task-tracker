# Refactor Report — reduce-complexity-and-duplication

Track: backend
Baseline SHA: `935dc9af224333e382e31d161a9a8eca9126ccfa`
Final SHA: `c040078`
Iterations: 6 (planner sliced 7; iter-7 cleanup pass deemed unnecessary)
Final verdict: **PASS**
Final weighted total: **9.555** (peak; pass threshold 7.0)

## Behavior preservation summary

- Behavior contract: `behavior-contract.md` (+ `.json`), captured at baseline SHA `935dc9a`, frozen at iteration 0.
- Drift events across the run: 0 (no out-of-tolerance drift in any of 6 iterations)
- Final-iteration drift: false
- Six contract-bearing surfaces byte-identical at HEAD: `openapi_json`, `features_proto_surface`, `ef_migrations_history`, `ef_schema_columns`, `feature_entity_shape`, `api_endpoint_matrix`
- Three surfaces drifted within planner-pinned tolerances: `grpc_status_code_emit_sites` (set parity preserved on `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists}`), `feature_inline_edit_log_format` (12-field template parity, line-prefix only), `test_corpus_assertion_count` (831 → 905, additive-only)
- Tests: 442 (baseline) → 455 (HEAD); +13 net additive coverage; 0 regressed; 0 deleted assertions

## Outcome against MUST-improve axes

| # | Axis | Baseline | Target | Final | Status |
|---|------|----------|--------|-------|--------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | ≤ 320 | **313** | met (-36.5%) |
| 2 | Manager-ownership guard literal copies | 7 | 1 | **0** | exceeded |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | ≤ 2 | **2** | met |
| 4 | `PlanMapper.MapSummary` overload count | 10 | 1 | **1** | met |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 1 | **1** | met |
| 6 | `ExtractDisplayName` definitions in gateway | 2 | 1 | **1** | met |
| 7 | `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites in gateway | 2 | 1 | **1** | met |
| 8 | `dotnet build` errors / warnings (refactor delta) | 0 / 0 | 0 / 0 | **0 / 0** | met |
| 9 | `dotnet test` regressed count | 0 | 0 | **0** | met (455/455 green) |

## Score progression

| Iter | Total | Drift | Notes |
|------|-------|-------|-------|
| 1 | 8.225 | false | Scaffolding only — 4 helpers + 18 sibling tests; no MUST-improve axis moved yet (PASS reflects scaffolding quality) |
| 2 | 8.450 | false | 4 feature-level handlers migrated; LoC 493 → 423; mgr-guard 7 → 3; concurrency catches 6 → 5 |
| 3 | 9.100 | false | 3 stage-level handlers migrated; axes 1, 2, 3 met (LoC 313, mgr-guard 0, catches 2); largest single-iteration lift |
| 4 | 9.325 | false | `PlanMapper.MapSummary` 10 → 1 via `IFeatureSummaryProjection` + 10 partial-class bridges; PlanMapper 226 → 137 LoC |
| 5 | 9.325 | false | `FeatureMappingConfig.Register` 10 → 1 via `IFeatureMappingTarget` + 10 bridges; mapping config 187 → 60 LoC |
| 6 | 9.555 | false | Gateway dedup: `DisplayNameHelper` (axis 6: 2 → 1) + `PlannedDateParser` (axis 7: 2 → 1) + 13 sibling tests |

## Notable changes

- **Inline-edit handler scaffolding** (`OneMoreTaskTracker.Features/Features/Update/`): 4 new helpers — `FeatureOwnershipGuard`, `FeatureVersionGuard`, `FeatureLoader`, `FeatureConcurrencySaver` — plus stage-level `StageEditContext` / `StageEditContextLoader`. All 7 inline-edit handlers (`UpdateFeatureTitleHandler`, `UpdateFeatureDescriptionHandler`, `UpdateFeatureLeadHandler`, `UpdateFeatureHandler`, `UpdateStageOwnerHandler`, `UpdateStagePlannedStartHandler`, `UpdateStagePlannedEndHandler`) now read as "what to mutate + what to log", with auth/load/version/save/log centralised.
- **Cross-namespace generated-DTO consolidation via partial-class bridges** (commits `b64c113`, `3cbab3f`): `PlanMapper.MapSummary` and `FeatureMappingConfig.Register` each collapse from 10 hand-written per-DTO blocks onto a single generic driver. 20 minimal bridge files (10 per side, under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/` and `OneMoreTaskTracker.Features/Features/Data/Bridges/`) light up `IFeatureSummaryProjection` / `IFeatureMappingTarget` on each proto-generated `FeatureDto` without touching proto-generated source.
- **Gateway helper single-sourcing** (commit `c040078`): canonical `DisplayNameHelper.ExtractDisplayName` (`OneMoreTaskTracker.Api/Controllers/DisplayNameHelper.cs`) and canonical `PlanRequestHelpers.TryParseIsoDate` (`OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs:19`); failure-message text preserved byte-for-byte ("Date must be YYYY-MM-DD", "Use a real release date").
- **Test growth +24%** across the run: 367 → 455 tests, all green; assertion count 831 → 905 (strictly additive). New tests cover all 6 helpers + 2 gateway helpers with happy-path, edge-case, and failure-message assertions.
- **Zero behavior drift** on every contract-bearing surface (`openapi_json`, proto, EF schema, endpoint matrix, entity shape) — verified by re-capture and diff against the frozen baseline at every iteration.
- **Diff scale**: 55 files changed, +1310 / -475 lines; 6 conventional `refactor(...)` commits; zero MUST-NOT-touch violations across all 6 iterations.

## Out-of-scope follow-ups

Pinned by the planner under `refactor-plan.md` §"Scope boundary"; not addressed by this run, recommended for separate `/gan-refactor` candidates:

- **`GrpcExceptionMiddleware` cleanup** — gateway's single error-translation point; touching it changes how every controller surfaces errors. Out of scope for this refactor; deserves its own focused run.
- **Cross-bounded-context date validation consolidation** — `Features` service has its own `DateOnly` parsing inside `Features/Data/`; deduplicating with the gateway-side helper would cross a bounded-context boundary and is a separate concern.
- **`ValidateStageOrder` caller cleanup** — the helper exists; some callers still inline equivalent checks. Mechanical follow-up.
- **`UserServiceHandler` simplification** (Users service) — flagged as complex but outside the Features/gateway scope of this run.
- **`PlanController` 831-line split** — large gateway controller; splitting into focused command/query halves is its own architectural decision.
- **`DevFeatureSeeder`** — dev-only seed code; complexity reduction would not affect production.

## Carry-over issues

No open `RF-*` issues with status `carried-over` or `regressed`. All 7 RF entries from the iter-6 evaluator (`RF-006-01..07`) are positive findings tagged `new` documenting clean closure of axes 6/7, the `ValidateOptionalReleaseDate` retention decision, the `InternalsVisibleTo` carve-out, MUST-NOT-touch compliance, project-rule compliance, refactor-goal closure, and absence of dead-code cleanup leftovers.

| Issue | Severity | Target file | Notes |
|-------|----------|-------------|-------|
| (none) | — | — | All planner-pinned axes closed; no behavioral or cleanup work outstanding |

## Post-run follow-up — pattern re-application to consolidated PATCH handlers

Track: backend
Triggering commit: `61024e1` (`refactor!(features,api,webclient): delete dead per-field PATCH surfaces and tighten aggregate invariants`) — landed AFTER this harness run. Folded the 7 migrated `Update*Handler` classes plus their callers into 2 consolidated sparse-PATCH surfaces (`PatchFeatureHandler`, `PatchFeatureStageHandler`) and, as part of removing the old handlers, deleted the harness's 4 helpers (`FeatureOwnershipGuard`, `FeatureVersionGuard`, `FeatureLoader`, `FeatureConcurrencySaver`) plus `StageEditContext`/`StageEditContextLoader` since they had no callers at the moment of the consolidation.

Net effect: the consolidated PATCH handlers re-acquired the same load + manager-guard + version-guard + concurrency-save duplication the harness had originally collapsed. Axes 2 and 3 silently regressed from `0` and `2` back to `2` and `2`, with the surviving 2 `catch (DbUpdateConcurrencyException)` blocks now back inline on the leaf handlers instead of in the `FeatureConcurrencySaver` helper.

This follow-up commit re-introduces the 4 helpers (one type per file, byte-identical signatures to the historical scaffolding from iter-1) and migrates both consolidated PATCH handlers onto them. `StageEditContext`/`StageEditContextLoader` were intentionally NOT re-introduced: with only 1 stage-level call site (`PatchFeatureStageHandler`) instead of 3, the loader-aggregation no longer earns its weight — the 3 helper calls inline at the call site are clearer than wrapping them in a single `Load → resolve-stage → ownership → version` pipeline.

Per-handler LoC delta:

| Handler | Pre-follow-up | Post-follow-up | Delta |
|---------|---------------|----------------|-------|
| `PatchFeatureHandler.cs` | 80 | 62 | -18 |
| `PatchFeatureStageHandler.cs` | 148 | 128 | -20 |
| 4 new helper files | 0 | 97 (25 + 13 + 19 + 40) | +97 |

Axis movement (re-evaluated against the consolidated handler surface):

| Axis | Pre-follow-up | Post-follow-up | Original target |
|------|---------------|----------------|-----------------|
| Manager-ownership guard literal copies in `Features/Features/Update/*.cs` | 2 | **0** | 1 (over-target) |
| `catch (DbUpdateConcurrencyException)` blocks in `Features/Features/Update/*.cs` | 2 | **2** (both inside `FeatureConcurrencySaver`) | ≤ 2 |

Behavior preservation: `dotnet build OneMoreTaskTracker.slnx` green (0 errors); `dotnet test OneMoreTaskTracker.slnx` green at 489/489 (63 GitLab.Proxy + 68 Tasks + 118 Features + 195 Api + 45 Users). Status codes, status-detail strings, log templates, and version-bump semantics preserved (the helpers emit byte-identical `RpcException` text and never touch `Version` themselves; mutator methods on `Feature`/`FeatureStagePlan` continue to bump `Version += 1` privately as the consolidation tightened them to do).

Lessons recorded in `run.log` Phase 4.
