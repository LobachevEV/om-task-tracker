# Refactor Feedback — reduce-complexity-and-duplication — iter 005

Iteration: 5
Track: backend
Generator commit: 3cbab3f
Baseline SHA: 935dc9af224333e382e31d161a9a8eca9126ccfa

## 1. Behavior preservation gate

Status: **PASS**.

Recapture done locally; the harness `capture-behavior-contract.mjs` / `diff-behavior-contract.mjs` scripts are not present in this worktree, so I ran the same source-of-truth surface commands the planner pinned in `behavior-contract.md` directly against baseline (`935dc9a`) and iter-5 HEAD (`3cbab3f`).

Surface-by-surface (sha = sha256 of normalized capture):

| Surface | Baseline | Iter-5 HEAD | Verdict |
|---------|----------|-------------|---------|
| `openapi_json` | `e1011ffd96c5148a5d41ccefaa3183a58ae483e6677623657fb8cd4b5b215b4f` | `e1011ffd96c5148a5d41ccefaa3183a58ae483e6677623657fb8cd4b5b215b4f` | byte-identical |
| `features_proto_surface` (concat of all `OneMoreTaskTracker.Features/Protos/**/*.proto`) | `8660974fb0cb02fdb1e43e678611cf7007d456da2b1453e6978c31d5ec883955` | `8660974fb0cb02fdb1e43e678611cf7007d456da2b1453e6978c31d5ec883955` | byte-identical |
| `api_endpoint_matrix` (sorted grep of `[HttpVerb] / [Authorize] / [AllowAnonymous] / [Route]` across `OneMoreTaskTracker.Api/Controllers/**/*.cs`) | `a33577f9280e78967bcd6e78d0d0db84ce7403a818a4086b2939cc4df12a5612` | `a33577f9280e78967bcd6e78d0d0db84ce7403a818a4086b2939cc4df12a5612` | byte-identical |
| `feature_entity_shape` (`Feature.cs` + `FeaturesDbContext.cs`) | unchanged | unchanged | byte-identical |
| `ef_migrations_history` (Features/Tasks/Users `Migrations/` dirs) | unchanged | unchanged | byte-identical |
| `grpc_status_code_emit_sites` set in `Features/Features` | `{InvalidArgument, NotFound, PermissionDenied, AlreadyExists, FailedPrecondition}` | same set | set-parity (planner-pinned tolerance, unchanged from iter-3) |
| `feature_inline_edit_log_format` | unchanged from iter-3 | unchanged | byte-identical (no log code touched this iter) |
| `test_corpus_assertion_count` | additive only | unchanged from iter-4 | within additive-only pin |

Iter-5 does not modify any handler, log emitter, validation site, controller, proto file, openapi.json, EF schema, or frontend code. The diff is fully contained inside `OneMoreTaskTracker.Features/Features/Data/`:

- `FeatureMappingConfig.cs`: 187 → 64 LoC (-123).
- `+ 10 bridge files` under `OneMoreTaskTracker.Features/Features/Data/Bridges/` (new directory), each 7 lines.
- `+ 1 IFeatureMappingTarget.cs` interface (16 lines).

Evidence (verbatim from `git diff --stat b64c113..3cbab3f`):

```
13 files changed, 137 insertions(+), 137 deletions(-)
```

(That includes the new `generator-notes-iter-005.md` markdown — the source-only churn is +100/-137 lines spread across `FeatureMappingConfig.cs`, the new interface, and the 10 bridges.)

The `openapi_json`, `features_proto_surface`, and `api_endpoint_matrix` shasum identity is the strongest available signal that the wire output of every consumer of `FeatureDto` is byte-identical to baseline. Mapster's compiled mapping for each of the 10 target types is rebuilt from the same `Feature → TDto` source-property graph as before; the Mapster registration moves from 10 hand-written `NewConfig()` blocks to one generic `RegisterFeatureToDto<TDto>()` body invoked 10 times, which produces an equivalent compiled mapper per target type (see "Mapster mechanism" below).

Conclusion: **BEHAVIOR_DRIFT=false**. No surface drifted. The planner-pinned tolerances on `grpc_status_code_emit_sites`, `feature_inline_edit_log_format`, and `test_corpus_assertion_count` carry over from iter-3 unchanged because iter-5 does not touch the source files those surfaces capture.

## 2. Baseline-test regression check

Re-ran `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo`: 0 errors, 16 warnings — identical inventory to iter-3/iter-4 (CS4014/CS0162/CS8604 in test files only; no new warnings introduced by iter-5).

Re-ran `dotnet test OneMoreTaskTracker.slnx --nologo --no-build`:

| Project | Passed | Failed | Skipped |
|---------|--------|--------|---------|
| OneMoreTaskTracker.Api.Tests | 183 | 0 | 0 |
| OneMoreTaskTracker.Features.Tests | 105 | 0 | 0 |
| OneMoreTaskTracker.Tasks.Tests | 59 | 0 | 0 |
| OneMoreTaskTracker.GitLab.Proxy.Tests | 63 | 0 | 0 |
| OneMoreTaskTracker.Users.Tests | 32 | 0 | 0 |
| **Total** | **442** | **0** | **0** |

`BASELINE_TESTS_REGRESSED=false`. Test count flat vs iter-4 (442 → 442). The 105 Features tests transitively cover `FeatureMappingConfig.Register` for every PATCH and read path: `CreateFeatureHandlerTests`, `GetFeatureHandlerTests`, `ListFeaturesHandlerTests`, `UpdateFeatureHandlerTests`, `UpdateFeatureTitleHandlerTests`, `UpdateFeatureDescriptionHandlerTests`, `UpdateFeatureLeadHandlerTests`, `UpdateStageOwnerHandlerTests`, `UpdateStagePlannedStartHandlerTests`, `UpdateStagePlannedEndHandlerTests` each Adapt() a `Feature` onto a different proto-namespace `FeatureDto` after persistence and assert the wire output. All green ⇒ the unified driver produces wire-equivalent output for each of the 10 target types.

## 3. MUST-improve axes (verified at HEAD)

Each axis recomputed using the source-of-truth command pinned in `refactor-plan.md` lines 17–27:

| # | Axis | Baseline | Iter-4 HEAD | Iter-5 HEAD | Target | Status |
|---|------|----------|-------------|-------------|--------|--------|
| 1 | Total LoC across 7 inline-edit handlers | 493 | 313 | **313** | ≤ 320 | met (carried, -36.5% vs baseline) |
| 2 | Manager-ownership guard literal copies | 7 | 0 | **0** | 1 | exceeded (carried) |
| 3 | `catch (DbUpdateConcurrencyException)` blocks | 6 | 2 | **2** | ≤ 2 (stretch 1) | met (carried) |
| 4 | `MapSummary` overload count in `PlanMapper.cs` | 10 | 1 | **1** | 1 | met (carried) |
| 5 | `TypeAdapterConfig<Feature, …>.NewConfig()` blocks | 10 | 10 | **1** | 1 | **met this iteration** |
| 6 | `ExtractDisplayName` definitions (gateway) | 2 | 2 | **2** | 1 | unchanged (planned for iter-6) |
| 7 | `DateOnly.TryParseExact("yyyy-MM-dd", …)` sites | 2 | 2 | **2** | 1 | unchanged (planned for iter-6) |
| 8 | `dotnet build` errors / new warnings | 0 / 0 | 0 / 0 | **0 / 0** | 0 / 0 | met |
| 9 | `dotnet test` regressed count | 0 | 0 | **0** | 0 | met (442/442) |

No axis regressed. Axis 5 closed cleanly: `grep -cE 'TypeAdapterConfig<Feature, [^>]+>\.NewConfig\(\)' OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` returned `10` at baseline / iter-4 and returns `1` at iter-5 HEAD. The single remaining `NewConfig()` lives at `FeatureMappingConfig.cs:46` inside the generic `RegisterFeatureToDto<TDto>()` driver.

7/9 axes now met or exceeded. Only axes 6 and 7 (gateway helper consolidation) remain — both in scope for iter-6 per `refactor-plan.md` §"Planned commits" #6.

## 4. Issue / finding inventory

### RF-005-01 — Axis 5 met cleanly via the pinned mechanism (positive finding)

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs:32-58`, `OneMoreTaskTracker.Features/Features/Data/IFeatureMappingTarget.cs`, `OneMoreTaskTracker.Features/Features/Data/Bridges/*.cs`
- **What**: 10 hand-written `TypeAdapterConfig<Feature, *>.NewConfig()` blocks collapsed onto one `RegisterFeatureToDto<TDto>()` generic driver invoked once per target type. The 10 generated `FeatureDto` types — one per proto namespace — are bridged via `public sealed partial class FeatureDto : IFeatureMappingTarget` declared in 10 dedicated bridge files under `OneMoreTaskTracker.Features/Features/Data/Bridges/`. Each bridge is 7 lines (using directive + namespace + `partial class` declaration). Implicit interface implementation lights up the interface members because every member of `IFeatureMappingTarget` matches the proto-generated `{ get; set; }` shape on each `FeatureDto`.
- **Why this is the right shape**: this is the canonical .NET application of the user-global `csharp-proto-domain-interface` skill. The planner explicitly recommended both this technique and the alternative loop-over-`(targetType, registrationAction)` tuple approach in `refactor-plan.md` line 31 ("Both are scored as '1 driver'"); the generator chose the bridge variant for symmetry with iter-4's gateway-side fix. The proto-generated source is **not** modified — `partial class` extends each generated `FeatureDto` from a sibling file. Same pattern as iter-4, applied on the Features service side as the rubric and feedback-004 recommended.
- **Next actions**: none — axis closed.

### RF-005-02 — Bridges adhere to one-type-per-file and no-comment rules

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Features/Features/Data/Bridges/*.cs`, `OneMoreTaskTracker.Features/Features/Data/IFeatureMappingTarget.cs`
- **What**: each of the 10 bridge files declares exactly one `partial class FeatureDto : IFeatureMappingTarget` with an empty body (the proto-generated public properties already satisfy the interface contract via implicit implementation). No comments, no TODO/FIXME, no log-only locals, no aggregator file. Naming convention `<ProtoNamespace>FeatureDtoBridge.cs` mirrors the gateway-side bridge layout from iter-4 (`OneMoreTaskTracker.Api/Controllers/Plan/Bridges/`).
- **Next actions**: none.

### RF-005-03 — Mapster mechanism preserves wire-shape semantics

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs:44-58`
- **What**: the new generic `RegisterFeatureToDto<TDto>()` body builds 11 explicit `Map(d => d.X, s => …)` calls per target type — the same property mapping that each per-type `NewConfig` previously expressed. Mapster compiles this generic body once per closed `TDto`, producing a per-`(Feature, TDto)` mapper that is observationally identical to the prior hand-rolled blocks. The previous `UpdateLeadDto` block intentionally omitted `Id`, `Title`, `LeadUserId`, `ManagerUserId`, `Version` — those mapped via Mapster's same-name convention. The unified driver maps them explicitly; Mapster's resulting setter values are identical (`s.Id` direct-int copy is the same path as the convention default), so the wire shape on `UpdateLeadDto.FeatureDto` does not move. `openapi_json` and `features_proto_surface` byte-identity at HEAD plus 105/105 Features tests passing confirm the equivalence end-to-end.
- **Next actions**: none.

### RF-005-04 — MUST-NOT-touch list cleanly respected

- **Severity**: positive (informational)
- **Where**: cross-file
- **What**: `git diff --name-only b64c113..3cbab3f` shows only:
  - `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs` (modified)
  - 10 new bridge files under `OneMoreTaskTracker.Features/Features/Data/Bridges/`
  - 1 new interface file `OneMoreTaskTracker.Features/Features/Data/IFeatureMappingTarget.cs`
  - 1 generator-notes markdown file under `gan-harness-refactor/`
  No proto file, no openapi.json, no migration, no `FeaturesDbContext.cs`, no `JwtTokenService` / `JwtOptions` / `Program.cs` auth block, no `GrpcExceptionMiddleware`, no `WebClient/`, no `appsettings*.json`, no `*.csproj`, no `*.slnx`. Contract-bearing surfaces are byte-identical (see §1).
- **Next actions**: none.

### RF-005-05 — `IFeatureMappingTarget` access modifier is `internal` — appropriate for a Mapster-internal contract

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Features/Features/Data/IFeatureMappingTarget.cs:3`
- **What**: the bridge interface is declared `internal`, scoping it to the Features service assembly. The 10 partial-class bridges are declared `public sealed partial class FeatureDto` (matching the proto-generated visibility) but bind to the internal interface only at compile-time inside the Features assembly — no public surface change. This is the right access-level choice: the interface is purely a Mapster-registration helper, never a domain abstraction, and exposing it broadly would invite consumers to use it as a domain interface (which would violate `~/.claude/rules/microservices/contracts.md` § "Generated transport types do not leak into domain"). Same internal-only scoping as the gateway-side `IFeatureSummaryProjection` from iter-4.
- **Next actions**: none.

### RF-005-06 — Idempotent `Register()` lock retained verbatim

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs:19-28`
- **What**: the existing `lock (RegisterLock) { if (_registered) return; _registered = true; }` guard is preserved, ensuring `Register()` remains safe under concurrent first-use. The `FeatureStagePlanMappingConfig.Register()` invocation also remains as the first body statement, so stage-plan mapping continues to register before feature mapping (existing ordering preserved). This was a non-trivial detail the generator could have lost; they didn't.
- **Next actions**: none.

### RF-005-07 — `BuildProtoStagePlans` helper preserved verbatim

- **Severity**: positive (informational)
- **Where**: `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs:60-63`
- **What**: the public `BuildProtoStagePlans(Feature feature)` helper is untouched — same body, same `OrderBy(sp => sp.Stage)`, same `sp.Adapt<ProtoFeatureStagePlan>()` projection. Callers across Features handlers continue to call it without source-level change.
- **Next actions**: none.

### RF-005-08 — Forward-look: axes 6/7 (gateway helpers) remain for iter-6

- **Severity**: low
- **Where**: `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`, `OneMoreTaskTracker.Api/Controllers/Team/TeamController.cs`, `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs`
- **What**: `ExtractDisplayName` still exists in 2 places (PlanMapper + TeamController). `DateOnly.TryParseExact("yyyy-MM-dd", …)` still has 2 call sites in the gateway (`PlanMapper.ValidateOptionalReleaseDate` and `PlanRequestHelpers.TryParseIsoDate`). Both are inside the same bounded context (`OneMoreTaskTracker.Api`) and can be safely deduped without crossing a service boundary — this matches `refactor-plan.md` §"Scope boundary" item 3 and the rubric line 53.
- **Next actions** (next iteration):
  1. Move `ExtractDisplayName` onto `PlanRequestHelpers` (or a sibling `DisplayName` static class), delete the duplicate from `TeamController`.
  2. Collapse `ValidateOptionalReleaseDate` + `TryParseIsoDate` onto a single helper that both call sites consume.

## 5. Score breakdown

| Criterion | Weight | Score | Contribution | Reasoning |
|-----------|--------|-------|--------------|-----------|
| `code_quality_delta` | 0.45 | 9.5 | 4.275 | Axis 5 hit target in one commit (10→1) using the planner-pinned mechanism. Cumulative: 7/9 axes met or exceeded (1, 2, 3, 4, 5, 8, 9). `FeatureMappingConfig.cs` LoC dropped 187→64 (-66%) without losing readability; the unified `RegisterFeatureToDto<TDto>()` body is the same 11 `Map(...)` calls that previously appeared 10× — a textbook DRY collapse. No regression on any axis. The lift mirrors iter-4 (one axis closed cleanly with the canonical mechanism); not 10/10 because axes 6 and 7 still pending. |
| `integration_and_conventions` | 0.20 | 9.5 | 1.90 | Adheres to the user-global `csharp-proto-domain-interface` skill verbatim — same mechanism the planner pinned and the iter-4 gateway-side fix used. One-type-per-file: 10/10 bridges + 1 interface + 1 mapping config. No comments, no TODO/FIXME, no log-only locals. No new utility duplicates anything. No new `OneMoreTaskTracker.Common` project (planner forbids it). Bridge directory `OneMoreTaskTracker.Features/Features/Data/Bridges/` is the obvious sibling location and naming `<ProtoNamespace>FeatureDtoBridge.cs` is symmetric with iter-4. `IFeatureMappingTarget` is internally-scoped (right access level for a Mapster-only contract). Idempotent `Register()` lock and stage-plan registration ordering preserved verbatim. |
| `test_coverage_delta` | 0.20 | 9.0 | 1.80 | Test count flat at 442/442 (no new tests added; none required — the 105 existing Features tests Adapt() a Feature onto each of the 10 proto-namespace `FeatureDto` types after persistence and assert the wire output, transitively covering every closed `RegisterFeatureToDto<TDto>()` body the generator introduced). No coverage drop on any touched file (LCOV unavailable in this worktree, but the build is green and 105 Features.Tests + 183 Api.Tests continue to pass — they exercise the mapping graph end-to-end). The `test_corpus_assertion_count` surface unchanged (additive-only pin honored trivially). |
| `perf_envelope` | 0.15 | 9.0 | 1.35 | No hot-path change. Mapster compiles `RegisterFeatureToDto<TDto>()` into a per-`TDto` mapper at first registration; once cached, every subsequent `Adapt<TDto>()` runs the compiled IL as fast as the previous per-type registrations. No new allocation per request, no new DB call, no extra reflection at call time. Test wall-clock duration unchanged vs iter-4 (Features test project runs in ~423 ms). |
| **TOTAL** | **1.00** | — | **9.325** | — |

## 6. Auto-fail summary

- [ ] Behavior contract drift (after tolerances) — **false**
- [ ] Test suite regressed — **false** (442/442 green, identical to iter-4)
- [ ] Coverage on touched file dropped > 2% — **false** (LCOV unavailable; build green; integration coverage of `RegisterFeatureToDto<TDto>()` for every closed `TDto` is exercised by the Adapt-and-assert paths in the 10 inline-edit + create + get + list handler test classes)
- [ ] Perf envelope regression beyond planner tolerance — **false**
- [ ] MUST-NOT-touch violation — **false** (proto / openapi.json / migrations / Auth / GrpcExceptionMiddleware / WebClient / csproj / appsettings unchanged)
- [ ] Contract bump attempted — **false**

## 7. Recommendation

**CONTINUE — iter 6 should focus on axes 6 and 7** (gateway `ExtractDisplayName` consolidation + `DateOnly.TryParseExact` consolidation, plan commit #6). Both duplications are inside the same bounded context (`OneMoreTaskTracker.Api`) and can be closed in one commit. After iter-6 the plan is fully executed (all 7 axes met or exceeded), leaving iter-7+ for any final polish or to early-exit if everything is clean.

This refactor is now 7/9 axes met or exceeded after iter-5 (axes 1, 2, 3, 4, 5, 8, 9). One more iteration closes the plan; the worktree remains in a clean and reviewable state.
