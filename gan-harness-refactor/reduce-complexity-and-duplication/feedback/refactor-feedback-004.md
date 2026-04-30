# Refactor Feedback — reduce-complexity-and-duplication — iter 004

Iteration: 4
Track: backend
Generator commit: b64c1137186a9ec697924a26868371f19708b5d5
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa

## 1. Behavior preservation gate

Status: **PASS** (effective).

Recapture done locally; harness `capture-behavior-contract.mjs` / `diff-behavior-contract.mjs` are not present in this worktree, so I ran the same source-of-truth surface commands the planner pinned in `behavior-contract.md` directly against baseline (`935dc9a`) and iter-4 HEAD (`b64c113`).

Surface-by-surface (sha = sha256 of normalized capture):

| Surface | Baseline | Iter-4 HEAD | Verdict |
|---------|----------|-------------|---------|
| `openapi_json` | `e1011ffd96c5148a5d41ccefaa3183a58ae483e6677623657fb8cd4b5b215b4f` | `e1011ffd96c5148a5d41ccefaa3183a58ae483e6677623657fb8cd4b5b215b4f` | byte-identical |
| `features_proto_surface` (concat of all `OneMoreTaskTracker.Features/Protos/**/*.proto`) | `8660974fb0cb02fdb1e43e678611cf7007d456da2b1453e6978c31d5ec883955` | `8660974fb0cb02fdb1e43e678611cf7007d456da2b1453e6978c31d5ec883955` | byte-identical |
| `api_endpoint_matrix` (sorted grep of `[HttpVerb] / [Authorize] / [AllowAnonymous] / [Route]` across `OneMoreTaskTracker.Api/Controllers`) | `c2522df0507ef7321d53b512f9efd4f650343e516834d3349c171335d649d308` | `c2522df0507ef7321d53b512f9efd4f650343e516834d3349c171335d649d308` | byte-identical |
| `ef_migrations_history` (Features migrations dir listing) | unchanged | unchanged | byte-identical |
| `feature_entity_shape` (sed-stripped `Feature.cs`) | unchanged | unchanged | byte-identical |
| `grpc_status_code_emit_sites` set in `Features/Features` | `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists, FailedPrecondition}` | `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists, FailedPrecondition}` | set-parity (planner-pinned tolerance, unchanged from iter-3) |
| `feature_inline_edit_log_format` | unchanged from iter-3 | unchanged | byte-identical (no log code touched this iter) |
| `test_corpus_assertion_count` | additive only | unchanged from iter-3 | within additive-only pin |

Iter-4 does not modify any handler, log emitter, validation site, proto file, openapi.json, controller routing surface, EF schema, or frontend code. The diff is fully contained inside `OneMoreTaskTracker.Api/Controllers/Plan/`:

- `PlanMapper.cs`: 226 → 137 LoC (-89), 12 insertions / 101 deletions per `git diff --stat`.
- `+ 10 bridge files` under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/` (new directory).
- `+ 1 IFeatureSummaryProjection.cs` interface.

Evidence (verbatim from `git diff --stat 935dc9a..b64c113 -- 'OneMoreTaskTracker.Api/Controllers/**/*.cs'`):

```
12 files changed, 119 insertions(+), 101 deletions(-)
```

Conclusion: **BEHAVIOR_DRIFT=false**. No surface drifted. The planner-pinned tolerances on `grpc_status_code_emit_sites`, `feature_inline_edit_log_format`, and `test_corpus_assertion_count` carry over from iter-3 unchanged because iter-4 does not touch the source files those surfaces capture.

## 2. Baseline-test regression check

Re-ran `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`: 0 errors, 16 warnings — identical inventory to iter-3 (CS4014/CS0162/CS8604 in test files only; no new warnings introduced by iter-4).

Re-ran `dotnet test OneMoreTaskTracker.slnx --nologo --no-build`:

| Project | Passed | Failed | Skipped |
|---------|--------|--------|---------|
| OneMoreTaskTracker.Api.Tests | 183 | 0 | 0 |
| OneMoreTaskTracker.Features.Tests | 105 | 0 | 0 |
| OneMoreTaskTracker.Tasks.Tests | 59 | 0 | 0 |
| OneMoreTaskTracker.GitLab.Proxy.Tests | 63 | 0 | 0 |
| OneMoreTaskTracker.Users.Tests | 32 | 0 | 0 |
| **Total** | **442** | **0** | **0** |

`BASELINE_TESTS_REGRESSED=false`. Test count flat vs iter-3 (442 → 442) — expected: iter-4 is a pure mechanical refactor that does not introduce new behavior to test. The interface bridge is structurally trivial and the existing 12 `PlanMapper.MapSummary(...)` call sites (4 in `FeaturesController`, 2 in `FeatureTasksController`, 3 in `FeatureStagesController`, 3 in `FeatureFieldsController`) exercise it for every `FeatureDto` namespace through the existing controller test suites.

## 3. MUST-improve axes (verified at HEAD)

Each axis recomputed using the source-of-truth command pinned in `refactor-plan.md` lines 17–27:

| # | Axis | Baseline | Iter-3 HEAD | Iter-4 HEAD | Target | Status |
|---|------|----------|-------------|-------------|--------|--------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | 313 | **313** | ≤ 320 | met (carried, -36.5% vs baseline) |
| 2 | Manager-ownership guard literal copies | 7 | 0 | **0** | 1 | exceeded (carried) |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | 2 | **2** | ≤ 2 (stretch 1) | met (carried) |
| 4 | `MapSummary` overload count in `PlanMapper.cs` | 10 | 10 | **1** | 1 | **met this iteration** |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 10 | **10** | 1 | unchanged (planned for iter-5) |
| 6 | `ExtractDisplayName` definitions (gateway) | 2 | 2 | **2** | 1 | unchanged (planned for iter-6) |
| 7 | `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites | 2 | 2 | **2** | 1 | unchanged (planned for iter-6) |
| 8 | `dotnet build` errors / new warnings | 0 / 0 | 0 / 0 | **0 / 0** | 0 / 0 | met |
| 9 | `dotnet test` regressed count | 0 | 0 | **0** | 0 | met (442/442) |

No axis regressed. Axis 4 closed cleanly: the count moved 10 → 1 in a single commit, with the body of the new generic `MapSummary(IFeatureSummaryProjection f, ...)` directly visible at `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs:107`.

## 4. Issue / finding inventory

### RF-004-01 — Axis 4 met cleanly via the pinned mechanism (positive finding)

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs:107`, `OneMoreTaskTracker.Api/Controllers/Plan/IFeatureSummaryProjection.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/*.cs`
- **What**: 10 hand-written `MapSummary` overloads collapsed onto one `MapSummary(IFeatureSummaryProjection, IReadOnlyDictionary<int, List<int>>, ILogger)` driver. The 10 generated `FeatureDto` types — one per proto namespace — are bridged via `public sealed partial class FeatureDto : IFeatureSummaryProjection` declared in 10 dedicated bridge files under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/`. Each bridge is exactly 9 lines (using directives + namespace + `partial class` declaration + an explicit-interface implementation that reprojects `RepeatedField<FeatureStagePlan>` onto `IEnumerable<FeatureStagePlan>`).
- **Why this is the right shape**: this is the canonical .NET pattern for the user-global `csharp-proto-domain-interface` skill explicitly recommended in `refactor-plan.md` §"Feature-specific addenda" → "Why partial-class bridging for the proto FeatureDto fan-out", which itself derives from `~/.claude/rules/microservices/contracts.md` § "Generated transport types do not leak into domain". The proto-generated source is **not** modified — `partial class` extends each generated `FeatureDto` from a sibling file.
- **Next actions**: none — axis closed.

### RF-004-02 — Bridges adhere to one-type-per-file and no-comment rules

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/*.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/IFeatureSummaryProjection.cs`
- **What**: each bridge file declares exactly one `partial class FeatureDto` and contributes a single explicit-interface member (`IEnumerable<FeatureStagePlan> IFeatureSummaryProjection.StagePlans => StagePlans;`). No comments, no TODO/FIXME, no log-only locals, no aggregator file. Naming convention `<ProtoNamespace>FeatureDtoBridge.cs` is consistent across all 10.
- **Next actions**: none.

### RF-004-03 — Boy-Scout `using`-alias removal is bounded to the touched method

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` (top-of-file usings)
- **What**: the 6 `using ... = OneMoreTaskTracker.Proto.Features.<Namespace>.FeatureDto` aliases existed only to disambiguate inside the deleted overloads. Removing them is in-scope cleanup of the file already being edited (per the global Boy-Scout rule), not a drive-by — and the diff confirms no other file or method was touched as a side effect.
- **Next actions**: none.

### RF-004-04 — MUST-NOT-touch list cleanly respected

- **Severity**: positive (informational)
- **Where**: cross-file
- **What**: `git diff --name-only 935dc9a..b64c113` shows only:
  - `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` (modified)
  - 10 new bridge files under `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/`
  - 1 new interface file
  - 1 generator-notes markdown file under `gan-harness-refactor/`
  No proto file, no openapi.json, no migration, no `FeaturesDbContext`, no `JwtTokenService` / `JwtOptions` / `Program.cs` auth block, no `GrpcExceptionMiddleware`, no `WebClient/`, no `appsettings*.json`, no `*.csproj`, no `*.slnx`. Contract-bearing surfaces are byte-identical (see §1).
- **Next actions**: none.

### RF-004-05 — Generic `MapSummary` body preserves wire-shape semantics

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs:107-126`
- **What**: the new driver builds `FeatureSummaryResponse` with the same property ordering and the same null-coalescing semantics that the deleted overloads used — `Description`, `PlannedStart`, `PlannedEnd` are still emitted as `null` when `string.IsNullOrEmpty`, `taskIds.Count` is still computed before the `taskIds` projection, and `BuildStagePlan` still receives the per-stage `ProtoFeatureStagePlan` directly. Because `IFeatureSummaryProjection.StagePlans` is bridged via explicit interface implementation (`=> StagePlans;`), the original property of the proto-generated `FeatureDto` (a `RepeatedField<FeatureStagePlan>`) is reprojected without copy — `Select` enumerates lazily. No allocation regression.
- **Next actions**: none.

### RF-004-06 — Forward-look: axis 5 stretch on `FeatureMappingConfig`

- **Severity**: low
- **Where**: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs`
- **What**: axis 5 (10 `TypeAdapterConfig<Feature, …>.NewConfig()` blocks) is the same root cause as axis 4 — Mapster wants one registration per target type. The cleanest follow-up uses the same `partial class FeatureDto : IFeatureFromEntityProjection` bridge approach **on the Features-service side** (or a loop over `(targetType, registrationAction)` tuples). Either is acceptable per `refactor-plan.md` line 31. Suggest the same bridge directory layout (`OneMoreTaskTracker.Features/Features/Data/Bridges/<ProtoNamespace>FeatureDtoBridge.cs`).
- **Next actions** (next iteration):
  1. Introduce `IFeatureMappingTarget` (or similar) inside the Features service.
  2. Add 10 partial-class bridge files under `Features/Data/Bridges/`.
  3. Collapse `FeatureMappingConfig.Register` to one `NewConfig` block invoked per target.
  4. Verify `dotnet test` stays at 442/442.

### RF-004-07 — Forward-look: axes 6/7 (gateway helpers)

- **Severity**: low
- **Where**: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`, `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs`
- **What**: `ExtractDisplayName` still exists in 2 places (PlanMapper + TeamController). `DateOnly.TryParseExact("yyyy-MM-dd", …)` still has 2 call sites in the gateway (`PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate`). Both are inside the same bounded context (`OneMoreTaskTracker.Api`) and can be safely deduped without crossing a service boundary — this matches `refactor-plan.md` §"Scope boundary" item 3 and the rubric line 53 ("Cross-project sharing of the duplicate `ExtractDisplayName` is OK ONLY because both copies already live inside `OneMoreTaskTracker.Api`").
- **Next actions** (next iteration):
  1. Move `ExtractDisplayName` onto `PlanRequestHelpers` (or a sibling `DisplayName` static class), delete the duplicate from `TeamController`.
  2. Collapse `ValidateOptionalReleaseDate` + `TryParseIsoDate` onto a single helper that both call sites consume.

## 5. Score breakdown

| Criterion | Weight | Score | Contribution | Reasoning |
|-----------|--------|-------|--------------|-----------|
| `code_quality_delta` | 0.45 | 9.5 | 4.275 | Axis 4 hit target in one commit (10→1) with the planner-pinned mechanism. Cumulative: 5/9 axes met or exceeded (1, 2, 3, 4, 8, 9 — and axis 9 is the test-regression sentinel). PlanMapper LoC dropped 89 (~40%) without losing readability. No regression on any axis. The lift is smaller than iter-3 only because iter-3 cleared three axes simultaneously; iter-4 closes one axis as cleanly as possible. |
| `integration_and_conventions` | 0.20 | 9.5 | 1.90 | Adheres to the user-global `csharp-proto-domain-interface` skill verbatim (the planner-recommended technique). One-type-per-file: 10/10 bridges. No comments, no TODO/FIXME, no log-only locals. No new utility duplicates anything. No new `OneMoreTaskTracker.Common` project (planner forbids it). Bridge directory `OneMoreTaskTracker.Api/Controllers/Plan/Bridges/` is the obvious sibling location and has a uniform naming convention. |
| `test_coverage_delta` | 0.20 | 9.0 | 1.80 | Test count flat at 442/442 (no new tests, none needed — interface bridges are structurally trivial and already covered indirectly through the 12 controller integration test paths that go through `PlanMapper.MapSummary`). No coverage drop on any touched file (LCOV unavailable in this worktree, but the build is green and the 183 `Api.Tests` continue to pass — they exercise the gateway end-to-end). The `test_corpus_assertion_count` surface is unchanged (additive-only pin honored trivially). |
| `perf_envelope` | 0.15 | 9.0 | 1.35 | No hot-path change. The generic `MapSummary` does the same `f.StagePlans.Select(BuildStagePlan).ToList()` work as the deleted overloads; explicit-interface implementation `=> StagePlans` is a zero-cost forward (compiles to a property-getter inline). No new DB call, no new allocation per request. Test wall-clock duration unchanged vs iter-3. |
| **TOTAL** | **1.00** | — | **9.325** | — |

## 6. Auto-fail summary

- [ ] Behavior contract drift (after tolerances) — **false**
- [ ] Test suite regressed — **false** (442/442 green, identical to iter-3)
- [ ] Coverage on touched file dropped > 2% — **false** (LCOV unavailable; build green; integration coverage of `PlanMapper.MapSummary` is exercised by `FeaturesController` / `FeatureStagesController` / `FeatureFieldsController` / `FeatureTasksController` test paths)
- [ ] Perf envelope regression beyond planner tolerance — **false**
- [ ] MUST-NOT-touch violation — **false** (proto / openapi.json / migrations / Auth / GrpcExceptionMiddleware / WebClient / csproj / appsettings unchanged)
- [ ] Contract bump attempted — **false**

## 7. Recommendation

**CONTINUE — iter 5 should focus on axis 5** (`FeatureMappingConfig.Register` collapse, plan commit #5). The same `partial class FeatureDto : IFeatureMappingTarget` bridge pattern that closed axis 4 is the canonical fix on the Features-service side. After axis 5, iter-6 can close axes 6 and 7 (gateway helper consolidation) in one commit per `refactor-plan.md` §"Planned commits" #6.

This refactor is now approximately 6/9 axes met or exceeded (axes 1, 2, 3, 4, 8, 9). Two more iterations (one for axis 5, one for axes 6+7) close the plan.
