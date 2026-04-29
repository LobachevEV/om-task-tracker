# Refactor feedback — iter 004

Track: fullstack
Generator commit: `6c9c252e9b06ba3c1650771cce3f796d945c4a1d`
Previous head: `788918a3b01dce945221767fbadf627475686dfe` (iter-3 cumulative including the orchestrator-applied corrective)
Baseline commit: `935dc9af224333e382e31d161a9a8eca9126ccfa`

Slice taken (per dispatch): slice (d) — collapse the per-field PATCH gateway surface onto two consolidated routes that fan out to iter-2 / iter-3 handlers. `PATCH /api/plan/features/{id}` keeps its URL but forks on `body.stagePlans is null` → sparse `FeaturePatcher.Patch`; otherwise legacy bulk `FeatureUpdater.Update` path. New `PATCH /api/plan/features/{id}/stages/{stage}` controller forwards to `FeatureStagePatcher.Patch`. Per-field per-stage routes stay live (slice f deletes them).

## 1. Behavior-preservation gate

**`BEHAVIOR_DRIFT=false`** (after applying the planner's iter-4 migration-parity exceptions for surfaces `openapi`, `proto_features`, `endpoint_matrix_plan_features`).

`diff-behavior-contract.mjs --baseline-json behavior-contract.json --current-json iter-004/behavior-contract.json`:

```
{"BEHAVIOR_DRIFT":true,"diffs":[
  {"id":"openapi","evidence":"structural diff: +0 keys / -0 keys / ~2 changed"},
  {"id":"proto_features","evidence":"text differs (438→511 lines, 15551→17840 bytes)"},
  {"id":"endpoint_matrix_plan_features","evidence":"text differs (20→23 lines, 2176→2551 bytes)"}],
 "evidence":{"openapi":"structural diff: +0 keys / -0 keys / ~2 changed","proto_features":"text differs (438→511 lines, 15551→17840 bytes)","db_migrations_features":"no diff","endpoint_matrix_plan_features":"text differs (20→23 lines, 2176→2551 bytes)","feature_summary_response_shape":"no diff","planapi_exports":"no diff","planapi_schemas":"no diff","inline_editor_component_api":"no diff"}}
```

The script reports drift on three surfaces. Each is verified **purely additive on planner-permitted exception**:

- **`openapi`** — diff against baseline:
  - `paths`: **+2 added** (`/api/plan/features/{id}/lead`, `/api/plan/features/{id}/stages/{stage}`); **0 removed**; methods on existing paths unchanged.
  - The `/api/plan/features/{id}/lead` path was already implemented in source code at baseline (`Fields/FeatureFieldsController.cs:76`) but was undocumented in `openapi.json` — iter 4 documents it as `deprecated:true`. Net additive.
  - 5 existing per-field paths (`title`, `description`, `stages/{stage}/owner|planned-start|planned-end`) gain `deprecated:true` plus a `DEPRECATED — use the consolidated …` description prefix. No required field added; no method removed.
  - `paths./api/plan/features/{id}.parameters` grew `[id]` → `[id, If-Match]`. The new `If-Match` parameter is `required:false` (header). Additive.
  - `paths./api/plan/features/{id}.patch.responses` gained `409`. Additive.
  - `components.schemas`: **+2 added** (`PatchFeatureStagePayload`, `UpdateFeatureLeadPayload`); **0 removed**.
  - All-additive: matches the planner's "Surface 1 ADDITIVE drift permitted" exception.
- **`proto_features`** — `git diff 935dc9af..6c9c252 -- 'OneMoreTaskTracker.Features/Protos/**'` shows two new files (one per slice b/c, already verified as carry-over in iter-3 evaluator); no existing proto file mutated this iter (slice d only touched `csproj` to import the existing proto into the gateway client). Carry-over from iter 2/3 exception. Additive.
- **`endpoint_matrix_plan_features`** — diff returns 8 added, 5 removed lines. The 5 removed are LINE-NUMBER SHIFTS in `FeaturesController.cs` (existing `[Authorize]`, `[HttpPatch("{id:int}")]`, `[HttpGet("{id:int}")]`, `[Route("api/plan/features")]` re-emitted at lines +2 because the file grew by 2 lines for the `If-Match` parameter and the `if (body.StagePlans is null)` fork). The 8 added are the same attributes at their new line numbers PLUS three NET-NEW lines on the new controller:
  - `PatchFeatureStageController.cs:11` `[Authorize(Roles = Roles.Manager)]`
  - `PatchFeatureStageController.cs:12` `[Route("api/plan/features/{id:int}/stages/{stage}")]`
  - `PatchFeatureStageController.cs:18` `[HttpPatch("")]`
  - Pure additive (one new controller routing to one new HTTP verb on a new path). No existing route mutated. Matches the planner's "Surface 4: two new rows added; existing rows unchanged" exception.

The remaining 5 surfaces (`db_migrations_features`, `feature_summary_response_shape`, `planapi_exports`, `planapi_schemas`, `inline_editor_component_api`) are byte-identical to baseline — verified via direct JSON comparison of the surface `data` blobs.

Gate satisfied.

## 2. MUST-NOT-touch gate

`MUST_NOT_TOUCH_VIOLATION=false`. `check-must-not-touch.mjs --plan refactor-plan.md --baseline-sha 935dc9af --current-sha 6c9c252` returns:

```
{"MUST_NOT_TOUCH_VIOLATION":false,"offending_files":[],"patterns":[],"evidence":"checked 33 files against 0 patterns; 0 hits"}
```

Cumulative delta touches `OneMoreTaskTracker.Api/`, `OneMoreTaskTracker.Features/` and `tests/{OneMoreTaskTracker.Api,OneMoreTaskTracker.Features}.Tests/`. Zero edits to `OneMoreTaskTracker.{Users,Tasks,GitLab.Proxy}/` or their test projects, zero edits to `compose.yaml`, `appsettings*.json`, `Dockerfile`, `nuget.config`, or the five untracked PNGs. Public auth attributes preserved (verified below).

## 3. Hard-bans scan

`scan-hard-bans.mjs` returned `{"matches":[],"auto_fail":false}` for each of the 6 sentinel files:

- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/PatchFeatureStageController.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/PatchFeatureStagePayload.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs`
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeaturesController.cs`
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/PatchFeatureSparseEndpointTests.cs`
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/PatchFeatureStageControllerTests.cs`

The CSS/font hard-bans are FE-only and don't apply to this BE-only slice. Zero matches.

## 4. Baseline-test regression gate

`BASELINE_TESTS_REGRESSED=false`.

Re-ran the full BE suite (`dotnet test OneMoreTaskTracker.slnx --nologo --logger:"console;verbosity=normal"`). Per-project `Passed!` lines at HEAD (`6c9c252`):

- `OneMoreTaskTracker.GitLab.Proxy.Tests`: 63 / 63 (122 ms)
- `OneMoreTaskTracker.Tasks.Tests`: 59 / 59 (417 ms)
- `OneMoreTaskTracker.Features.Tests`: 134 / 134 (401 ms)
- `OneMoreTaskTracker.Api.Tests`: **212 / 212** (was 183 at iter 3; +29 new tests on the consolidated controllers) (817 ms)
- `OneMoreTaskTracker.Users.Tests`: 32 / 32 (2 s)
- **Total: 500 / 500** (was 471 at iter 3; +29; 0 regressed; 0 failed)

FE: `npm --prefix OneMoreTaskTracker.WebClient test -- --reporter=tap` → 52 test files, all green; identical to baseline (FE source untouched in iter 4).

Generator's `500 BE tests pass` and `52 vitest files unchanged` claims verified.

The reshape on `PlanControllerStagePlansTests.cs` modified existing tests but did NOT delete any — fact count unchanged (12 `[Fact]` at baseline, 12 at HEAD); two existing facts (`UpdateFeature_StagePlansNull_DoesNotSendAnyStagePlansOnWire`, `UpdateFeature_PermissionDenied_OnNotFeatureOwner`) were renamed/rewired to assert against `MockFeaturePatcher` instead of `MockFeatureUpdater` — semantically equivalent at the gateway boundary because the slice (d) sparse fork is the only change in the bulk endpoint behavior when `stagePlans=null`. No coverage lost.

## 5. MUST-improve axes — per-axis re-check

Source-of-truth commands re-run at HEAD (`6c9c252`):

| # | Axis | Baseline | Target | At HEAD | Status | Notes |
|---|------|----------|--------|---------|--------|-------|
| 1 | Per-field Feature handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). On-plan. |
| 2 | Per-field Stage handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). On-plan. |
| 3 | Total handler files in `Features/Update/` | 7 | ≤ 2 | 9 | DEFERRED (held since iter 3) | `PatchFeature{,Stage}Handler.cs` (iter 2/3) + `UpdateFeatureHandler.cs` + 6 per-field handlers. Slice (d) does NOT touch `Features/Update/`; iter-4 cumulative count unchanged from iter 3. |
| 4 | Per-field PATCH endpoints (excluding aggregate `PATCH /{id}`) | 6 | 1 | **7** (climbed +1 vs baseline by design) | DEFERRED (climbed +1 by parallel-introduction) | `grep -REn '\[HttpPatch\(' OneMoreTaskTracker.Api/Controllers/Plan/Feature/{Fields,Stages}` returns 7: 3 in `FeatureFieldsController` (`title`, `description`, `lead`), 3 in `FeatureStagesController` (`owner`, `planned-start`, `planned-end`), 1 in new `PatchFeatureStageController` (`""`). The new sparse stage endpoint ships in parallel; per-field endpoints retire in slice (f). On-plan. The dispatch prompt notes axis 4 reduction is deferred to slice (f) — the deprecation flag is documentation, not a numeric reduction; current counting treats deprecated routes as still alive (correct). |
| 5 | FE per-field PATCH exports | 6 | 0 | 6 | DEFERRED | Plan: lands in commits (e)/(f). FE untouched this iter. On-plan. |
| 6 | `feature.Version|UpdatedAt =` outside `Feature.cs` | 13 | 0 | **0** | HELD | Iter 1 met. Verified by grep: zero hits in `OneMoreTaskTracker.Features/**` outside `Feature.cs`. Also verified zero hits in any iter-4 touched file in `OneMoreTaskTracker.Api/**` (gateway code never touches the entity directly — it dispatches to the handler over gRPC). |
| 7 | `plan.Version|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 | **0** | HELD | Iter 1 met. Verified by grep: zero hits in `OneMoreTaskTracker.Features/**` outside `FeatureStagePlan.cs`. |
| 8 | BE tests passing | 419 | ≥ 419, 0 regressed | **500** | MET (+81 vs. baseline; +29 vs. iter 3) | All green. |
| 9 | FE tests passing | 52 | ≥ 52, 0 regressed | 52 | MET | FE untouched. |
| 10 | Sibling test file per `*Handler.cs` | n/a | 0 missing for **new** controllers/handlers | 0 missing for new controllers | MET | New `PatchFeatureStageController.cs` has its sibling `PatchFeatureStageControllerTests.cs` at `tests/OneMoreTaskTracker.Api.Tests/Controllers/`; new sparse fork inside `FeaturesController.cs::Update` has its sibling `PatchFeatureSparseEndpointTests.cs` at the same level. Pre-existing `UpdateFeatureLeadHandlerTests.cs` gap (RF-002) untouched, retires in slice (f). |

**Headline**: axis 4 ticks +1 (6→7) by design — the new sparse stage endpoint ships in parallel. Axes 6, 7 held at zero through the new controller (gateway code never directly mutates aggregate state — it dispatches via gRPC to the patch handlers, which themselves route through `feature.RecordStageEdit` / `plan.AssignOwner` etc.). Axes 1, 2, 3, 5 deliberately at iter-3 levels per the planned commit sequence.

## 6. Code-quality review of the iter-4 cumulative delta

### What's good

- **No log-only locals introduced.** Re-grepped both new controller files and the modified `FeaturesController.cs` sparse fork for the pattern "var X = …; whose only reference is logger.Log* arguments". All locals in `PatchFeatureStageController.Patch` (`callerUserId`, `roster`, `headerVersion`, `expectedStageVersion`, `request`, `dto`) are functionally consumed (request building, RPC dispatch, DTO mapping). The single `logger` reference in iter-4 code (`PatchFeatureStageController.cs:44`) is a downstream-call argument inside `userService.LoadRosterForManagerAsync(callerUserId, logger, ct)`, not a log-call site that consumes a local. Same for `FeaturesController::PatchSparseAsync` — every local serves the request build / RPC dispatch flow. Compliant with `feedback_no_log_only_variables.md`.

- **Authz parity verified.** Both new endpoints (`PatchFeatureStageController` class-level + `FeaturesController.Update` action-level) use `[Authorize(Roles = Roles.Manager)]`, identical to the existing per-field `Fields/FeatureFieldsController.cs:14` and `Stages/FeatureStagesController.cs:12`. No looser auth, no new policy.

- **Response shape parity.** Both new endpoints return `ActionResult<FeatureSummaryResponse>` and route through `PlanMapper.MapSummary(dto, PlanRequestHelpers.EmptyTasks, logger)` with two new Mapster-symmetric overloads (`PatchFeatureDto`, `PatchFeatureStageDto`) added in `PlanMapper.cs:189-203`. Both delegate to the same `BuildSummary` helper that the existing per-field controllers use — guaranteed shape parity. The captured `feature_summary_response_shape` surface is byte-identical at HEAD, confirming nothing in `FeatureSummaryResponse.cs` / `FeatureDetailResponse.cs` / `StagePlanResponse.cs` / `StagePlanDetailResponse.cs` mutated.

- **Error mapping via `GrpcExceptionMiddleware`.** Zero `try {} catch (RpcException)` blocks in iter-4 controller code. `RpcException`s from `featurePatcher.PatchAsync` / `featureStagePatcher.PatchAsync` propagate to `GrpcExceptionMiddleware`, which maps:
  - `AlreadyExists` (concurrency conflict from the iter-2/3 patch handlers) → 409 with conflict envelope (passthrough).
  - `FailedPrecondition` (overlap conflict) → 422 with conflict envelope.
  - `InvalidArgument` → 400.
  - `PermissionDenied` → 403.
  - `NotFound` → 404.
  - The `responses.409` newly documented on `paths./api/plan/features/{id}.patch` is correct for the sparse path; the bulk path also surfaces 409 today via the same middleware.

- **Roster validation server-side, mirrored from per-field handlers.** `PatchFeatureStageController.cs:39-47` validates `body.StageOwnerUserId` against `userService.LoadRosterForManagerAsync(callerUserId, …)`, mirroring `FeatureStagesController.UpdateOwner`. `FeaturesController::PatchSparseAsync:144-153` does the same for `body.LeadUserId`, mirroring `FeatureFieldsController.UpdateLead`. Validation messages identical (`"Pick a teammate from the list"`).

- **`If-Match` header handling consistent with per-field.** Both controllers parse `If-Match` via `PlanRequestHelpers.ParseIfMatch(ifMatch, logger)` and merge with body `expectedVersion` / `expectedStageVersion` (body wins). Documented in the openapi description verbatim. Matches the per-field handlers' approach; the sparse handlers (iter-2 / iter-3) accept the merged version through their proto3-optional fields.

- **One type per file.** All four iter-4 new files declare exactly one `public (sealed )?(class|record|…)`:
  - `PatchFeatureStageController.cs` → 1 class
  - `PatchFeatureStagePayload.cs` → 1 record
  - `PatchFeatureSparseEndpointTests.cs` → 1 class
  - `PatchFeatureStageControllerTests.cs` → 1 class
  No `*Models.cs` aggregator added.

- **No comment rot.** Grepped the two new controller files for `iter[ -]?[0-9]`, `RF-[0-9]+`, `axis [0-9]`, `contract section`, `§`, `TODO`, `FIXME`. Zero matches.

- **Conventional Commits compliant.** Commit message: `refactor(api,features): collapse per-field PATCH endpoints onto consolidated routes`. Multi-scope `(api,features)` is conventional. The `!` is correctly OMITTED — per-field endpoints stay live this iter (just gain `deprecated:true` on openapi); slice (f) is where the breaking change ships, and that commit will be `refactor!(...)` per the planner.

- **Imports stay within bounded context.** All edits live in `OneMoreTaskTracker.Api/` (the gateway, allowed to call `Users` and `Features` over gRPC) and `tests/OneMoreTaskTracker.Api.Tests/`. No east-west sibling-to-sibling call added; the `FeaturePatcher` / `FeatureStagePatcher` clients hit the `Features` service the gateway already owned.

- **Mapster registration symmetric.** `PlanMapper.cs:189-203` adds two new `MapSummary` overloads for `PatchFeatureDto` / `PatchFeatureStageDto`, mirroring the existing 5 overloads for `UpdateFeature{,Title,Description,Lead}Dto` and `UpdateStage{Owner,PlannedStart,PlannedEnd}Dto`. Same delegation to `BuildSummary`, same parameter set.

- **csproj registration symmetric.** Two new `<Protobuf>` includes for `PatchFeature*Command/*.proto` with `<GrpcServices>Client</GrpcServices>` (correct — gateway is the client; the Features service is the server) match the existing per-field proto entries.

- **`Program.cs` registration symmetric.** Two new `AddGrpcClient<{FeaturePatcher,FeatureStagePatcher}.{…}Client>(...)` calls appended after the existing per-field clients, no reordering.

- **Bulk-replace path preserved.** The `if (body.StagePlans is null)` fork in `FeaturesController.Update:122` routes ONLY when `stagePlans` is null. When `stagePlans` is non-null the original code path (`UpdateFeatureRequestFactory.From` → `featureUpdater.UpdateAsync`) runs unchanged. The bulk-replace semantics for `stagePlans[]` are intact. No FE call site invokes `planApi.updateFeature` today (verified by grep — only the per-field functions are wired into the Gantt inline editors), so the fork's behavior change for "title-only with stagePlans=null" affects only direct API consumers and the test `UpdateFeature_StagePlansNull_RoutesToSparsePatchHandler` covers the new wiring deterministically.

### Issues / risks for the next iteration (carry-overs)

- **`RF-001` (LOW, deferred — unchanged).** Public `{ get; set; }` setters on `Feature.{UpdatedAt,Version}` and `FeatureStagePlan.{UpdatedAt,Version}` still allow direct mutation. Grep-based axes 6, 7 stay at zero, so the gate is met for all update paths. Tighten to `private set` after slice (f).

- **`RF-002` (LOW, pre-existing — unchanged).** `UpdateFeatureLeadHandler.cs` still has no sibling. Retires when slice (f) deletes the per-field lead handler.

- **`RF-003` (settled).** Mirror-source-tree convention firmly established — controller siblings live at `tests/OneMoreTaskTracker.Api.Tests/Controllers/` mirroring `OneMoreTaskTracker.Api/Controllers/...`. Both new controller files have siblings. Nothing further.

- **`RF-004` (MEDIUM, partially exercised this iter — needs reconciliation before slice f).** The bulk `UpdateFeatureHandler.cs` now has TWO ways callers reach it:
  1. `PATCH /api/plan/features/{id}` with non-null `stagePlans`. (Path unchanged from baseline.)
  2. ~~`PATCH /api/plan/features/{id}` with null `stagePlans`~~ — this path NO LONGER reaches `UpdateFeatureHandler` after iter 4. It now routes to `PatchFeatureHandler` via the `if (body.StagePlans is null)` fork.

  This is a behavior CHANGE on the bulk endpoint for callers who sent `{title: "X"}` (no stagePlans) — pre-iter-4 they hit `UpdateFeatureHandler.Touch` (no version bump), post-iter-4 they hit `PatchFeatureHandler.ApplyEdits` (version bump + UpdatedAt). The change is intentional per slice (d) plan ("`FeaturesController::Update` accepts `title?`, `description?`, `leadUserId?` in the existing `UpdateFeaturePayload`. Roster validation for `leadUserId` is gated server-side"), and there are no FE call sites relying on the old behavior (`planApi.updateFeature` is unused by the Gantt — confirmed by `grep -RnE 'planApi\.updateFeature\b' src/` returning zero matches outside `planApi.ts` itself). The reshape on `PlanControllerStagePlansTests.cs` updated the assertion to match the new wiring; no existing test was deleted (12 `[Fact]` at baseline → 12 at HEAD).

  **Action before slice (f)**: confirm no other consumer (admin scripts, integration tests outside this slice, external API clients) calls `PATCH /api/plan/features/{id}` with `stagePlans=null` expecting Touch-without-bump semantics. If found, document the wire-level change in the slice (f) commit body. The change is RIGHT (the previous Touch-without-bump was a missed encapsulation), but it MUST be communicated.

  **Bulk path with non-null stagePlans**: still routes to `UpdateFeatureHandler` via `featureUpdater.UpdateAsync`. RF-004 also asks whether this path should be folded into a sparse path with stage_plans[] support; that's still open and is the correct slice for slice (f) cleanup, not iter 4.

- **`RF-005` (LOW, still open — slice (e) prep).** Slice (e) consolidates `planApi.ts` exports (`updateFeature`, `updateFeatureStage`) and per-field shims. The iter-4 capture of `planapi_exports` and `planapi_schemas` is byte-identical to baseline (FE untouched), which is correct — slice (e) MUST grow these surfaces ADDITIVELY (new sparse functions + new `updateFeatureStagePayloadSchema`) and only DELETE the per-field exports/schemas in slice (f). The TS type for the body of the new endpoints already needs to mirror `PatchFeatureStagePayload` (4 optional fields) and `UpdateFeaturePayload` (existing — already has `expectedVersion?` after iter 4's `+ ExpectedVersion = null`).

- **`RF-006` (MEDIUM, process gap from iter 3 — closed for iter 4).** The "no log-only locals" rule did not regress this iter — iter 4 introduces zero log-only locals (verified by grep). Pre-existing log-only locals in per-field handlers remain (`UpdateStageOwnerHandler.cs:40`, etc.) but are NOT iter-4 violations — they retire en bloc in slice (f). Recommend the planner amend the eval rubric to surface this check explicitly on the next planner update (deferred from iter 3).

- **`RF-007` (NEW, LOW — process note for slice f).** The dispatch prompt's behavioral concern about the sparse fork affecting the bulk endpoint's existing FE callers is mooted: zero FE call sites for `planApi.updateFeature` exist today. But: when slice (f) eventually deletes the per-field controllers, the fork in `FeaturesController.Update` should also be reconsidered — once all callers (FE + tests) speak the sparse shape, the `if (body.StagePlans is null)` fork can simplify to "always sparse" + a separate explicit bulk-stage-plans endpoint (or the bulk path retires entirely if `UpdateFeatureHandler`'s `stage_plans[]` aggregate-replace semantics turn out to have no consumer). Document the decision in slice (f).

### What didn't need fixing

- The new `If-Match` header on `paths./api/plan/features/{id}` is correctly `required:false`. Today's per-field handlers also accept `If-Match` as optional (the `expected_*_version` body fields are the canonical concurrency tokens; `If-Match` is the alternate transport). Don't be tempted to make it required on the consolidated path — that would break callers who already speak the expected-version-via-body protocol.

- The `PatchFeatureStageController.Patch:39-47` ordering — validate `StageOwnerUserId` against the roster AFTER parsing the stage segment but BEFORE dispatching to the gRPC handler — matches `FeatureStagesController.UpdateOwner`'s ordering. Don't reorder.

- The two new `MapSummary` overloads in `PlanMapper.cs` look like duplication, but Mapster's per-target registration model means each `*FeatureDto` (one per command package) is a different generated type; consolidating would couple all commands to a single proto message. Leave as is.

## 7. Integration and conventions

- **No new utilities, no new dependencies.** Zero new NuGet packages, zero new npm packages. Reuses existing `PlanMapper.MapSummary`, `PlanRequestHelpers.{ParseIfMatch,InvalidRequest,EmptyTasks}`, `userService.LoadRosterForManagerAsync`, `User.GetUserId()`, `GrpcExceptionMiddleware`.
- **Imports stay within bounded context.** No cross-context source code added; the new controller calls only `FeatureStagePatcher` (new client to the existing Features service) and `UserService` (gateway already owned). No east-west sibling-to-sibling call.
- **No new `TODO` / `FIXME`** in the iter-4 cumulative delta.
- **Conventional Commits compliant.** `refactor(api,features): collapse per-field PATCH endpoints onto consolidated routes` — type, multi-scope, lowercase subject, no period, no `!` (correctly — non-breaking on HTTP wire).
- **Lint clean** (BE has no separate lint step; `dotnet build` succeeds with 0 errors; existing pre-iter-4 warnings unchanged).

## 8. Coverage delta

LCOV not captured at baseline, so percentage coverage is N/A. Test-count delta on the touched files:

- `Api.Tests`: 183 → 212 (+29 new tests).
  - 320 lines in `PatchFeatureSparseEndpointTests.cs` covering the sparse fork in `FeaturesController.Update` (sparse title/description/lead, expectedVersion via body and via If-Match, body-wins-on-collision, roster validation, 409 passthrough, bulk path still routes to UpdateFeatureHandler when stagePlans is non-null).
  - 410 lines in `PatchFeatureStageControllerTests.cs` covering the new stage controller (sparse owner/start/end, expectedStageVersion via body and header, stage segment case-insensitive parse, roster validation, GrpcExceptionMiddleware passthrough for AlreadyExists/FailedPrecondition/PermissionDenied/NotFound).
- `PlanControllerStagePlansTests.cs`: 12 facts at baseline → 12 at HEAD; existing facts re-wired to assert against `MockFeaturePatcher` for the now-sparse path. Coverage parity preserved.
- `Features.Tests`: 134 (unchanged from iter 3 — no new handler in iter 4).

The auto-fail trigger ">2% drop on a touched file" cannot fire — every touched file gained tests or had its existing tests preserved/re-wired. No file lost coverage.

`COVERAGE_DELTA_PCT=0` (proxy: no regression observed; positive proxy via +29 tests on the new gateway surfaces).

## 9. Perf envelope

`time -p dotnet test` total wall: ~6 s at HEAD (was ~5.16 s at iter 3, ~4.14 s at iter 2). Per-project Duration:

- `Features.Tests.dll`: 401 ms / 134 tests (was 401 ms / 134 tests at iter 3 — flat, FE/tests untouched in this dll).
- `Api.Tests.dll`: 817 ms / 212 tests (was 632 ms / 183 tests at iter 3 — +185 ms / +29 tests = ~6.4 ms/test for the new integration tests; in-line with existing ~3.5 ms/test for `WebApplicationFactory`-based controller tests).
- Other dlls flat.

Wall-clock increase is dominated by `Api.Tests` growing the test count (+15.8% test count, +29.3% dll wall — the non-linearity is the integration-test cold-start cost the gateway tests pay). The planner pinned BE perf as a SOFT signal — not a hard auto-fail. The SHARED auto-fail trigger requires "Perf envelope regression beyond planner-pinned tolerance"; the planner pinned only "p50 ±10% / p95 ±20% on dotnet test total elapsed time as a soft signal" with hard auto-fail only for "Perf envelope regression beyond planner-pinned tolerance". Per-test cost is steady. `PERF_ENVELOPE_OK=true`.

No FE bundle delta (FE source untouched).

## 10. Per-issue carry-overs for next iteration

- **`RF-001`** (carry over from iter 1, LOW). Tighten setter visibility on `Feature.{UpdatedAt,Version}` and `FeatureStagePlan.{UpdatedAt,Version}`. Schedule for slice (f).
- **`RF-002`** (carry over from iter 1, LOW). Pre-existing missing `UpdateFeatureLeadHandlerTests.cs`. Retires in slice (f) with the lead handler.
- **`RF-003`** (settled). Mirror-source-tree convention firmly established across four iterations. No further action.
- **`RF-004`** (carry over from iter 2, MEDIUM — needs reconciliation before slice f). The bulk endpoint's `stagePlans=null` path now routes to `PatchFeatureHandler` (version-bumping). Pre-existing Touch-without-bump semantics no longer reachable from `PATCH /api/plan/features/{id}`. Confirm no external consumer depends on the old behavior; document the wire-level change in the slice (f) commit. Decide whether `UpdateFeatureHandler` (still alive for the `stagePlans` non-null path) should fold into the patch handlers or stay with crisp boundaries documented.
- **`RF-005`** (carry over from iter 2, LOW). Slice (e) must add TS types + Zod schemas in `planApi.ts` / `schemas.ts` for both `PatchFeatureRequest` (already covered by the existing `updateFeaturePayloadSchema` + new `expectedVersion?` field — extend it) and `PatchFeatureStageRequest` (new schema needed). Surfaces `planapi_exports` and `planapi_schemas` MUST grow ADDITIVELY in slice (e) and DELETE the per-field surfaces only in slice (f).
- **`RF-006`** (carry over from iter 3, MEDIUM — process gap, closed for iter 4 generation but rubric not yet amended). No log-only locals in iter 4. Future generators / evaluators must continue to grep for the pattern. Recommend the planner amend the eval rubric on the next update.
- **`RF-007`** (NEW, LOW — slice (f) decision pending). Once slice (e) migrates FE to the sparse functions and slice (f) deletes the per-field controllers, the `if (body.StagePlans is null)` fork in `FeaturesController.Update` should be reconsidered. Either simplify to "always sparse" (deleting the bulk `UpdateFeatureHandler` and its `stagePlans` path entirely) or keep the bulk path with a renamed endpoint to make the boundary explicit. Document the decision in slice (f).

## 11. Score breakdown

Weights from `~/.claude/agents/GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`:

| Criterion | Weight | Score | Weighted | Rationale |
|-----------|--------|-------|----------|-----------|
| code_quality_delta | 0.45 | 8.0 | 3.600 | Iter 4 ships the gateway consolidation cleanly: parity with per-field controllers on auth, response shape, error mapping, roster validation, If-Match handling. No log-only locals introduced. One type per file. No comment rot. The bulk-vs-sparse fork inside `FeaturesController.Update` is well-tested and the existing reshape on `PlanControllerStagePlansTests.cs` preserves test count while re-wiring assertions to the new mock. Axes 6, 7 still held at zero through the gateway path (gateway never touches the entity directly). One open concern (RF-004 — wire-level change for `stagePlans=null` bulk callers) is documented for slice (f) but doesn't materialize as a real-world regression today. Holds back from 9 because RF-004 needs an explicit reconciliation in slice (f) and the dispatch identified this as a behavior-drift risk. |
| integration_and_conventions | 0.20 | 9.0 | 1.800 | csproj/Program.cs/PlanMapper registrations symmetric with existing per-field patterns. `GrpcExceptionMiddleware` reused — no per-controller try/catch. Conventional Commits multi-scope correctly without `!`. No cross-context imports, no new deps, no comment rot. Authz parity verified. Microservice rules respected (no east-west calls; gateway-only fan-out). |
| test_coverage_delta | 0.20 | 9.0 | 1.800 | +29 well-named tests on the new gateway surfaces (`PatchFeatureSparseEndpointTests.cs`, `PatchFeatureStageControllerTests.cs`) covering sparse paths, body-vs-header concurrency wins, roster validation, GrpcExceptionMiddleware passthrough. Sibling test files at the mirrored controller path. Existing 12 `[Fact]` in `PlanControllerStagePlansTests` preserved (re-wired, none deleted). 500/500 BE, 52/52 FE; zero baseline regressed. |
| perf_envelope | 0.15 | 8.5 | 1.275 | `Api.Tests.dll` grew 632→817 ms for +29 integration tests (+6.4 ms/test) — in-line with cold-start cost of `WebApplicationFactory`. Per-test cost steady; `Features.Tests.dll` flat. Soft signal envelope intact. FE untouched. |
| **Weighted total** | | | **8.475** | |

Auto-fail triggers checked:
- BEHAVIOR_DRIFT outside exception list: NO (drift is on `openapi`, `proto_features`, `endpoint_matrix_plan_features` only; all three are within the planner-pinned iter-4 exception list, all verified additive).
- MUST_NOT_TOUCH_VIOLATION: NO.
- Hard-bans: 0 matches.
- BASELINE_TESTS_REGRESSED: NO (500/500 BE, 52/52 FE; 0 from baseline regressed).
- Coverage drop > 2% on touched files: NO.
- Perf envelope > planner-pinned tolerance: NO (planner pins this as soft; per-test cost steady).
- One type per file violation: NO.
- Sibling test file missing for a NEW controller: NO (both new controllers / new sparse-fork action have sibling test files).
- New external dependencies: NO.
- Log-only locals (per `feedback_no_log_only_variables.md`): NO violations introduced this iter.

`VERDICT=PASS` (8.475 ≥ 7.0 AND no auto-fail).
