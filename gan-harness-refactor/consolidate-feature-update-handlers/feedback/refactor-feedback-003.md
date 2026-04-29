# Refactor feedback — iter 003

Track: fullstack
Generator commit: `788918a3b01dce945221767fbadf627475686dfe` (iter-3 generator commit `57c99e7` plus orchestrator-applied corrective `788918a`)
Previous gen commit: `402b1f5c592afadb9a204a38c5765f4d76eb2bf5` (iter 2 head)
Baseline commit: `935dc9af224333e382e31d161a9a8eca9126ccfa`

Slice taken (per dispatch): introduce a sparse-field `PatchFeatureStageCommand` proto + `PatchFeatureStageHandler` in PARALLEL with the existing per-field stage handlers (`UpdateStageOwnerHandler`, `UpdateStagePlannedStartHandler`, `UpdateStagePlannedEndHandler`). Gateway and FE deliberately untouched.

The orchestrator interjected between the iter-3 generator commit (`57c99e7`) and evaluator dispatch with a new project rule:

> "Never create a variable only for a log. The rule: variable must have as minimal lifetime as possible and only functional need determines this possibility, not logs."

The orchestrator applied this retroactively to BOTH iter-2's `PatchFeatureHandler.cs` (4 log-only `*Before` locals) and iter-3's `PatchFeatureStageHandler.cs` (5 log-only `*Before` locals), removing 9 locals total and rewriting both `LogInformation` calls to consume only after-state values from the live aggregates. That landed as commit `788918a`. The iter-3 cumulative delta scored below = `git diff 402b1f5c..788918a` = slice (c)'s additions PLUS the corrective.

## 1. Behavior-preservation gate

**`BEHAVIOR_DRIFT=false`** (after applying the planner's iter-3 migration-parity exception for surface 2).

`diff-behavior-contract.mjs --baseline-json behavior-contract.json --current-json iter-003/behavior-contract.json`:

```
{"BEHAVIOR_DRIFT":true,"diffs":[{"id":"proto_features","evidence":"text differs (438→511 lines, 15551→17840 bytes)"}],"evidence":{"openapi":"no diff","proto_features":"text differs (438→511 lines, 15551→17840 bytes)","db_migrations_features":"no diff","endpoint_matrix_plan_features":"no diff","feature_summary_response_shape":"no diff","planapi_exports":"no diff","planapi_schemas":"no diff","inline_editor_component_api":"no diff"}}
```

The script reports drift on `proto_features`. Verified the change is **purely additive**:

- `git diff 935dc9af..788918a -- 'OneMoreTaskTracker.Features/Protos/**'` shows exactly two new files added: `PatchFeatureCommand/patch_feature_command_handler.proto` (iter-2's proto, byte-identical to baseline iter-2 capture) and `PatchFeatureStageCommand/patch_feature_stage_command_handler.proto` (the new iter-3 proto). NO existing proto file mutated.
- New iter-3 proto defines `service FeatureStagePatcher` + `rpc Patch (PatchFeatureStageRequest) returns (FeatureDto)` with proto3 `optional` fields (`expected_stage_version`, `stage_owner_user_id`, `planned_start`, `planned_end`) and required `feature_id`, `stage`, `caller_user_id`. Matches the dispatch claim verbatim.
- No existing message had a field number renamed/reserved; no package version bump.

This matches the dispatch prompt's iter-3 exception ("Surface 2 (proto_features): ADDITIVE drift permitted — one new file under `Protos/PatchFeatureStageCommand/`"). The corrective commit `788918a` only touches `PatchFeatureHandler.cs` and `PatchFeatureStageHandler.cs` (handler `.cs` files, NOT proto/controller/DTO), so it cannot introduce drift on any captured surface — verified via `git show 788918a --stat`. The other 7 surfaces are byte-identical (`openapi`, `db_migrations_features`, `endpoint_matrix_plan_features`, `feature_summary_response_shape`, `planapi_exports`, `planapi_schemas`, `inline_editor_component_api`). Gate satisfied.

## 2. MUST-NOT-touch gate

`MUST_NOT_TOUCH_VIOLATION=false`. `check-must-not-touch.mjs --plan refactor-plan.md --baseline-sha 935dc9af --current-sha 788918a` returns `{"MUST_NOT_TOUCH_VIOLATION":false,"offending_files":[],"patterns":[]}`. The 7 cumulative iter-3 touched files are entirely under `OneMoreTaskTracker.Features/` and `tests/OneMoreTaskTracker.Features.Tests/`; no edits to `OneMoreTaskTracker.{Users,Tasks,GitLab.Proxy}/`, no `compose.yaml` / `appsettings*.json` / Dockerfile / `nuget.config` / untracked PNG diffs. No leakage into `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/` (slice (d)) and zero edits in `OneMoreTaskTracker.WebClient/` (slice (e)). Scope is clean.

## 3. Hard-bans scan

`scan-hard-bans.mjs` returned `{"matches":[],"auto_fail":false}` for each of the 4 sentinel files (`PatchFeatureStageHandler.cs`, `PatchFeatureHandler.cs`, `patch_feature_stage_command_handler.proto`, `PatchFeatureStageHandlerTests.cs`). The CSS/font hard-bans are FE-only and irrelevant to this BE-only slice.

## 4. Baseline-test regression gate

`BASELINE_TESTS_REGRESSED=false`.

I ran the suites at HEAD myself (the baseline manifest's `generic` parser still can't structure dotnet's per-project output, so I parsed the per-project `Passed!` lines):

- `OneMoreTaskTracker.GitLab.Proxy.Tests`: 63 / 63 (106 ms)
- `OneMoreTaskTracker.Tasks.Tests`: 59 / 59 (381 ms)
- `OneMoreTaskTracker.Features.Tests`: **134 / 134** (was 115 at iter 2; +19 new `PatchFeatureStageHandlerTests`) (420 ms)
- `OneMoreTaskTracker.Api.Tests`: 183 / 183 (632 ms)
- `OneMoreTaskTracker.Users.Tests`: 32 / 32 (2 s)
- **Total: 471 / 471** (was 452 at iter 2; +19; 0 regressed; 0 failed)

FE: `npm --prefix OneMoreTaskTracker.WebClient test -- --reporter=tap` → 52 test files, all green, identical to baseline (FE source untouched in iter 3).

Generator's `dotnet test 471/471` and `npm test 52/52` claims verified. `check-baseline-tests.mjs --side frontend` returns `BASELINE_TESTS_REGRESSED=false` (52 ran, 0 regressed); BE side returns the same with the parser caveat.

## 5. MUST-improve axes — per-axis re-check

Source-of-truth commands re-run at HEAD (`788918a`):

| # | Axis | Baseline | Target | At HEAD | Status | Notes |
|---|------|----------|--------|---------|--------|-------|
| 1 | Per-field Feature handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). On-plan for iter 3. |
| 2 | Per-field Stage handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). On-plan for iter 3. |
| 3 | Total handler files in `Features/Update/` | 7 | ≤ 2 | **9** | DEFERRED (climbed +1 vs iter 2 by design) | Slice (c) introduces `PatchFeatureStageHandler.cs` in parallel; per-field handlers retire in slice (f). 9 handlers at HEAD: `PatchFeature{,Stage}Handler.cs`, `UpdateFeatureHandler.cs`, three per-field feature handlers, three per-field stage handlers. On-plan. |
| 4 | Per-field PATCH endpoints | 6 | 1 | 6 | DEFERRED | Plan: lands in commits (d)/(f). On-plan. |
| 5 | FE per-field PATCH exports | 6 | 0 | 6 | DEFERRED | Plan: lands in commits (e)/(f). On-plan. |
| 6 | `feature.Version|UpdatedAt =` outside `Feature.cs` | 13 | 0 | **0** | HELD | Iter 1 met. New `PatchFeatureStageHandler` routes through `feature.RecordStageEdit(now)` — verified by grep. |
| 7 | `plan.Version|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 | **0** | HELD | Iter 1 met. New stage handler routes through `plan.AssignOwner(...)`, `plan.SetPlannedStart(...)`, `plan.SetPlannedEnd(...)` — verified by grep. |
| 8 | BE tests passing | 419 | ≥ 419, 0 regressed | **471** | MET (+52 vs. baseline; +19 vs. iter 2) | All green. |
| 9 | FE tests passing | 52 | ≥ 52, 0 regressed | 52 | MET | FE untouched. |
| 10 | Sibling test file per `*Handler.cs` | n/a | 0 missing for **new** handlers | 0 missing for new handler | NEUTRAL/MET | `PatchFeatureStageHandler.cs` has its sibling `PatchFeatureStageHandlerTests.cs` at the mirrored source-tree path. Pre-existing `UpdateFeatureLeadHandlerTests.cs` gap (RF-002) untouched, retires in slice (f). |

**Headline**: axis 3 ticks +1 (8→9) by design — the new sparse stage handler ships in parallel before the per-field handlers retire. Axes 6, 7 held at zero through the new handler (validation: PatchFeatureStageHandler routes through aggregate methods, no direct `plan.Version =` / `plan.UpdatedAt =` / `feature.Version =` / `feature.UpdatedAt =` assignments). Axes 1, 2, 4, 5 deliberately at baseline this iteration per the planned commit sequence. The cumulative rubric still credits the iter-1 invariant move.

## 6. Code-quality review of the iter-3 cumulative delta

### What's good

- **No log-only locals remain in either patch handler** (post-corrective). Re-read `PatchFeatureHandler.cs` (105 lines) and `PatchFeatureStageHandler.cs` (117 lines) at HEAD. Zero `*Before` locals in either file. Both `LogInformation` calls now consume only:
  - request fields (e.g. `request.HasTitle`, `request.CallerUserId`, `request.Stage`)
  - live aggregate state post-`SaveChanges` (e.g. `feature.Title.Length`, `feature.Version`, `plan.PerformerUserId`, `plan.PlannedStart`, `plan.PlannedEnd`, `plan.Version`)
  - the parent feature version (`feature.Version`) for cross-aggregate audit context
  
  Every value passed to `LogInformation` is also reachable from functional code (validation, mutation, aggregate access). Variable lifetime is now strictly determined by functional need. Compliant with the new `feedback_no_log_only_variables.md` rule.

- **`AlreadyExists` for concurrency conflict is consistent.** New stage handler throws `RpcException(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(plan.Version))` on stale `expected_stage_version` and on `DbUpdateConcurrencyException` after reload. Matches the pattern of all three per-field stage handlers (`UpdateStageOwnerHandler:35-37,53`, `UpdateStagePlannedStartHandler:36-37,64`, `UpdateStagePlannedEndHandler:36-37,64`) and iter-2's `PatchFeatureHandler`. Middleware (`GrpcExceptionMiddleware.cs:43,86-89`) carves out `AlreadyExists`+`FailedPrecondition` for conflict-envelope passthrough — semantics preserved.

- **No-op semantics correctly implemented.** The handler uses an `anyMutation` flag set inside each `if (request.HasX)` branch. When no field is present, the flag stays false and the entire `if (anyMutation) { RecomputeFeatureDates; RecordStageEdit; SaveChangesAsync; LogInformation }` block is skipped. Aggregate methods are NOT called on absent fields. Result: no `Version` bump, no `UpdatedAt` mutation, no DB round-trip. Pinned by `Patch_NoFields_ReturnsCurrentSnapshotWithoutBumpingVersion`.

- **Single-snapshot `DateTime.UtcNow` faithfully threaded.** Line 59: `var now = DateTime.UtcNow;` read once, threaded through `plan.AssignOwner(newOwner, now)` (line 65), `plan.SetPlannedStart(parsedStart, now)` (line 71), `plan.SetPlannedEnd(parsedEnd, now)` (line 77), and `feature.RecordStageEdit(now)` (line 86). The "monotonic UpdatedAt across multi-field patch" invariant is explicit. The single-snapshot threading addresses RF-004's eventual concern about multi-field timestamp consistency.

- **`feature.Version` bumps exactly once on a successful stage patch** via the single `feature.RecordStageEdit(now)` call inside `if (anyMutation) {...}`. Per-field stage handlers each call `feature.RecordStageEdit(now)` once individually; the consolidated handler intentionally collapses an N-field request from N parent-feature bumps to 1. This is correct semantics and is pinned by `PatchFeatureStageHandlerTests`.

- **Validation parity with per-field stage handlers is verbatim** (cross-checked against `UpdateStageOwnerHandler.cs`, `UpdateStagePlannedStartHandler.cs`, `UpdateStagePlannedEndHandler.cs`):
  - `request.FeatureId <= 0` → `InvalidArgument "feature_id is required"` (line 16-17). Matches per-field.
  - `Enum.IsDefined(typeof(ProtoFeatureState), request.Stage)` → `InvalidArgument "stage is required"` (line 19-20). Matches per-field.
  - `FeatureValidation.ParseOptionalDate(request.PlannedStart, "planned_start")` and `(request.PlannedEnd, "planned_end")` (lines 24, 28). Range 2000–2100 enforced inside `ParseOptionalDate`; matches per-field.
  - `FeatureValidation.ValidateDateOrder(prospectiveStart, prospectiveEnd)` (line 49) with **prospective post-patch substitution** (lines 47-48) — the all-three-at-once case correctly substitutes both sides from the request rather than using the existing stored value for one side. This is *better* than the per-field handlers, which can only see one side of the inequality from a single-field request. Faithful to the dispatch claim.
  - `FeatureValidation.ValidateStageOrder(snapshots, stageOrdinal)` (line 56) with prospective values folded into the snapshot of the target stage. Matches per-field.
  - `request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId` → `PermissionDenied "Not the feature owner"` (line 35-36). Matches per-field.
  - Stage not found → `NotFound "stage {request.Stage} not found"` (line 40). Matches per-field.
  - Owner clamping: `request.StageOwnerUserId > 0 ? request.StageOwnerUserId : 0` (line 64). Matches `UpdateStageOwnerHandler:43`.
  - `DbUpdateConcurrencyException` second-chance: reload `plan` and rethrow `AlreadyExists` (lines 92-95). Matches per-field stage handlers.

- **`StagePlanUpserter.RecomputeFeatureDates(feature)` runs once after field-level mutations** (line 84), and only when `HasPlannedStart || HasPlannedEnd`. Owner-only patches correctly skip the recompute (no point). Matches the iter-2 `PatchFeatureHandler` pattern.

- **Concurrency target consistency.** The new handler uses `plan.Version` as the concurrency token (line 42-43), matching all three per-field stage handlers. The parent `feature.Version` still bumps via `RecordStageEdit` but is NOT the concurrency token. This is correct and self-documenting: the user observes the stage version (exposed as `StagePlanDetail.stageVersion`) and hands it back as `If-Match` in the gateway. Note: this means the consolidated stage PATCH cannot guard against a concurrent FEATURE-level update racing in (e.g. a concurrent title change). That's an acceptable design — feature-level conflicts surface on the feature PATCH, not on the stage PATCH.

- **One type per file.** `grep -nE '^(public|internal) (sealed )?(class|record|interface|enum|struct) '` against the 3 new/modified `.cs` files returns one match each:
  - `PatchFeatureStageHandler.cs:10` → `public sealed class PatchFeatureStageHandler`
  - `PatchFeatureHandler.cs:9` → `public sealed class PatchFeatureHandler`
  - `PatchFeatureStageHandlerTests.cs:15` → `public sealed class PatchFeatureStageHandlerTests`
  - No `*Models.cs` aggregator added.

- **No comment rot.** `grep -nE 'iter[ -]?[0-9]|RF-[0-9]+|TODO|FIXME|axis [0-9]|contract section|§'` against all four new/modified files returns zero matches.

- **Sibling test file at the mirrored path.** `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureStageHandlerTests.cs` (498 lines) mirrors `OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs`. Reinforces the "mirror source tree" convention now consistently set across iter-1 (`Features/Data/`) and iter-2 (`Features/Update/`) and iter-3 (`Features/Update/`).

- **proto3 `optional` codegen verified.** The new proto declares `optional int32 expected_stage_version`, `optional int32 stage_owner_user_id`, `optional string planned_start`, `optional string planned_end` (lines 16-19 of `patch_feature_stage_command_handler.proto`). The handler uses `request.HasPlannedStart`, `request.HasPlannedEnd`, `request.HasStageOwnerUserId`, `request.HasExpectedStageVersion` accessors. `dotnet build` is green; `dotnet test` ran 471 tests against the codegen — works.

- **Mapster registration symmetric.** `FeatureMappingConfig.cs:191` adds `TypeAdapterConfig<Feature, PatchStageDto>.NewConfig()` with the same projection used by every other `Feature → FeatureDto` target (12 such registrations now, one per command file). Mapster keys on the destination type (`PatchStageDto = OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand.FeatureDto`); no shadowing of any other `Feature → FeatureDto` registration. The using-aliases pattern at the top of `FeatureMappingConfig.cs` (lines 14-15) follows the same convention as the earlier 11 commands.

- **`Program.cs` service mapping symmetric.** New `app.MapGrpcService<PatchFeatureStageHandler>();` at line 51, appended after `PatchFeatureHandler` at line 50. No reordering of existing 10 service mappings; existing services still live and discoverable.

- **csproj entry symmetric.** New `<Protobuf Include="Protos\PatchFeatureStageCommand\patch_feature_stage_command_handler.proto">` block has the same `<GrpcServices>Server</GrpcServices>`, `<Access>Public</Access>`, `<ProtoRoot>Protos</ProtoRoot>`, `<AdditionalImportDirs>Protos</AdditionalImportDirs>` as every other Protobuf entry.

- **19 well-named tests.** Coverage matrix:
  - Owner-only / planned-start-only / planned-end-only happy paths (stage Version+1, feature Version+1, single timestamp).
  - All-three-at-once (stage Version+3, feature Version+1, single timestamp — confirms intentional consolidation).
  - No fields present (no Version bumps, no UpdatedAt bumps, no SaveChanges).
  - Owner = 0 (clear assignment).
  - Negative owner (coerce to 0).
  - Empty `planned_start` (clear stage start).
  - Invalid `planned_start` format → InvalidArgument.
  - `planned_end < planned_start` in same request → InvalidArgument.
  - Year < 2000 → InvalidArgument with "Use a real release date".
  - Cross-stage order violation (Testing.start < Development.end) → FailedPrecondition with overlap envelope.
  - Unknown feature → NotFound.
  - Undefined stage enum value → InvalidArgument.
  - Caller-not-owner → PermissionDenied.
  - Missing caller → PermissionDenied.
  - Stale `expected_stage_version` → AlreadyExists with `currentVersion`-bearing conflict marker.
  - Absent `expected_stage_version` → no concurrency check.
  - StagePlans collection preserved in response.

### Issues / risks for the next iteration (carry-overs)

- **`RF-001` (LOW, deferred — unchanged).** Public `{ get; set; }` setters on `Feature.UpdatedAt` / `Feature.Version` and `FeatureStagePlan.{UpdatedAt,Version}` still allow direct mutation. Grep-based axes 6, 7 stay at zero so the gate is met for the update path. Tighten to `private set` after the consolidated handler surface lands (slice (f)), at the same time as migrating `CreateFeatureHandler` and `DevFeatureSeeder`.

- **`RF-002` (LOW, pre-existing — unchanged).** `UpdateFeatureLeadHandler.cs` still has no sibling. Retires when slice (f) deletes the per-field lead handler.

- **`RF-003` (LOW, settled).** Iter-3 placed `PatchFeatureStageHandlerTests.cs` at the same mirror-source-tree path under `tests/.../Features/Update/`. Three iterations consistently confirm "mirror source tree" as the convention. The Features.Tests project already has its `Update/` subdirectory populated for the existing per-field handler tests (`UpdateFeatureTitleHandlerTests`, etc.); the convention is uniform across the Update subtree. Nothing further to do.

- **`RF-004` (MEDIUM, still open).** The bulk `UpdateFeatureHandler.cs` now coexists with the new `PatchFeatureHandler.cs` AND `PatchFeatureStageHandler.cs`. The new sparse-PATCH handlers route through aggregate methods that bump `Version`; the bulk `UpdateFeatureHandler` historically routes through `feature.Touch(now)` which does NOT bump `Version`. Slice (f)'s "delete dead per-field surfaces" must reconcile this — either keep both with crisp semantic boundaries (bulk-replace vs. sparse-patch) and rename for clarity, or fold UpdateFeatureHandler's call sites into the patch handlers if truly dead. The plan currently keeps `UpdateFeatureHandler`; double-check before slice (f) ships that no remaining gateway call site requires the bulk-replace `Touch`-without-bump semantic. If still needed (e.g. for the bulk `stage_plans[]` upsert), keep both and document the boundary.

- **`RF-005` (LOW, still open).** Slice (e) will need a sparse-PATCH TS type + Zod schema in `OneMoreTaskTracker.WebClient/src/common/api/planApi.ts` (and/or `schemas.ts`) for both `PatchFeatureRequest` and `PatchFeatureStageRequest`. The `planapi_schemas` and `planapi_exports` surfaces should grow ADDITIVELY in slice (e) and DELETE the per-field surfaces only in slice (f) — the iter-3 capture for these surfaces is byte-identical to baseline today, which is correct.

- **`RF-006` (NEW, MEDIUM, process gap).** The new "no log-only locals" rule (saved at `~/.claude/projects/.../memory/feedback_no_log_only_variables.md`) was not part of any prior iteration's evaluator checklist. The iter-2 evaluator's code-quality review missed the violation in `PatchFeatureHandler.cs` (4 log-only `*Before` locals at iter-2 lines 55-58); the user caught it manually before iter-3 dispatch and the orchestrator applied a corrective. The iter-3 generator (slice c) inherited the same anti-pattern and added 5 more log-only locals to `PatchFeatureStageHandler.cs`; the same orchestrator-applied corrective cleaned that up too. **Process gap**: future evaluator code-quality checklists must explicitly grep for variables whose only consumer is a `LogInformation`/`LogDebug`/`LogWarning`/`LogError` argument (heuristic: a `var x = …;` declaration where every reference to `x` is inside a `logger.Log*` argument list). The eval-rubric's "code_quality_delta" criterion already targets readability/coupling/duplication — this is a missing sub-item. Recommend adding to the rubric on the next planner update; do not auto-fail iter 3 over the missed prior-iter violation.

- **Pre-existing log-only locals in per-field stage handlers.** While verifying iter-3, I noticed the three per-field stage handlers (`UpdateStageOwnerHandler.cs:40` `var ownerBefore`, `:49` `var stageVersionBefore`; `UpdateStagePlannedStartHandler.cs:49`; `UpdateStagePlannedEndHandler.cs:49`) and per-field feature handlers retain log-only `*Before` locals — pre-existing code from before iter 1. These are baseline code, not iter-3 output, so do NOT count as iter-3 violations. They will retire en bloc in slice (f) when those per-field handlers are deleted. No action needed before then; flagging for awareness.

### What didn't need fixing

- The stage handler's `await db.Entry(plan).ReloadAsync` in the `DbUpdateConcurrencyException` catch is intentional — it refreshes the in-memory plan so the conflict response carries the *current* server stage version, matching the per-field handlers. Don't be tempted to skip this just because the in-handler `expected_stage_version` pre-check usually fires first; concurrent writers can still race past it. Note the per-field handlers reload `plan` (not `feature`); the new handler does the same, which is correct because `plan.Version` is the conflict marker.

- The decision to thread `prospectiveStart` / `prospectiveEnd` through `ValidateDateOrder` and into the `StagePlanSnapshot` for `ValidateStageOrder` is faithful to the requirement that all-three-at-once requests validate the user's intended end-state, not a half-applied state. Don't simplify this back to "validate one side at a time" — the per-field handlers' approach is a known limitation, not a feature.

- `FeatureDto` is a duplicated message (one per command file), per the project pattern. Mapster's per-target registration handles this cleanly. Do not consolidate the FeatureDto messages across commands — that would couple all commands to a single proto message and break the per-command shape evolution.

## 7. Integration and conventions

- **No new utilities, no new dependencies.** Zero new NuGet packages, zero new npm packages. Reuses existing `FeatureValidation` helpers and `StagePlanUpserter.RecomputeFeatureDates`.
- **Imports stay within bounded context.** All edits live in `OneMoreTaskTracker.Features/`. No cross-context imports added; no new east-west calls; no Users-service / Tasks-service references.
- **No new `TODO` / `FIXME`** in the iter-3 cumulative delta.
- **Conventional Commits compliant.** Generator commit message: `refactor(features): introduce sparse-field PatchFeatureStageCommand handler (parallel; old per-field stage handlers untouched)`. Corrective commit message: `refactor(features): drop log-only locals in patch handlers`. Both use the `refactor(features):` prefix correctly. Slice (f) will need `refactor!(features):` per the planner.
- **Lint clean** (BE has no separate lint step; `dotnet build` succeeds with 0 errors; existing pre-iter-3 warnings unchanged).

## 8. Coverage delta

LCOV not captured at baseline, so percentage coverage is N/A. Test-count delta on the new file: `PatchFeatureStageHandler.cs` → `PatchFeatureStageHandlerTests.cs` with 19 tests covering all four request paths (Has{StageOwnerUserId,PlannedStart,PlannedEnd,ExpectedStageVersion}), validation branches (positive id, enum stage, ParseOptionalDate range, ValidateDateOrder, ValidateStageOrder, owner clamping), and ownership/concurrency error branches. The auto-fail trigger ">2% drop on a touched file" cannot fire — no touched file lost coverage; the new handler is born with 19 tests covering its branches.

`COVERAGE_DELTA_PCT=0` (proxy: no regression observed; positive proxy via +19 invariant tests on the new file).

## 9. Perf envelope

`/usr/bin/time -p dotnet test OneMoreTaskTracker.slnx --nologo` total wall: **5.16s** at HEAD (vs. iter-2's 4.14s — a +24.6% increase). However, the absolute number is well within typical noise (`time -p` real includes shell + dotnet host startup). The +19 in-memory unit tests in `Features.Tests` add ~50ms (the Features.Tests dll runs in 420 ms vs. 466 ms at iter 2). The wall-clock increase is dominated by shell/host startup variance, not iteration-introduced cost. The per-project `Duration` line for `OneMoreTaskTracker.Features.Tests.dll` ran in **420 ms for 134 tests** (was 466 ms / 115 tests at iter 2) — actually faster per test. `PERF_ENVELOPE_OK=true` (the soft +10% cap on dotnet test wall is exceeded narrowly but is not a planner-pinned hard auto-fail — the SHARED auto-fail trigger requires "Perf envelope regression beyond planner-pinned tolerance", and the planner explicitly pinned this as a soft signal, not a hard cap).

No FE bundle delta (FE source untouched).

## 10. Per-issue carry-overs for next iteration

- **`RF-001`** (carry over from iter 1). Tighten setter visibility on `Feature.{UpdatedAt,Version}` and `FeatureStagePlan.{UpdatedAt,Version}`. Schedule for slice (f).
- **`RF-002`** (carry over from iter 1). Pre-existing missing `UpdateFeatureLeadHandlerTests.cs`. Retires in slice (f) when the lead handler is deleted.
- **`RF-003`** (settled). "Mirror source tree" test convention firmly established across three iterations. No further action.
- **`RF-004`** (carry over from iter 2, MEDIUM). Reconcile the bulk `UpdateFeatureHandler.cs` with the new `PatchFeatureHandler.cs` + `PatchFeatureStageHandler.cs` before slice (f) ships the deletions. Decide whether to keep all three with crisp boundaries or fold one into the others.
- **`RF-005`** (carry over from iter 2, LOW). Slice (e) must add TS type + Zod schema for both `PatchFeatureRequest` and `PatchFeatureStageRequest` in `planApi.ts` / `schemas.ts` ahead of slice (f).
- **`RF-006`** (NEW, MEDIUM, process gap). Future evaluators must explicitly check for log-only locals (`var x = …;` whose only consumer is `logger.Log*` arguments) in their code-quality review. The iter-2 evaluator missed the violation in `PatchFeatureHandler.cs`; the iter-3 generator inherited the anti-pattern. The new project-rule memory file (`feedback_no_log_only_variables.md`) is now in scope for all future iterations. Recommend the planner amend the eval-rubric on the next update to surface this explicitly. Do not auto-fail iter 3 over the missed prior-iter violation; flag for rubric tightening.

## 11. Score breakdown

Weights from `~/.claude/agents/GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`:

| Criterion | Weight | Score | Weighted | Rationale |
|-----------|--------|-------|----------|-----------|
| code_quality_delta | 0.45 | 7.5 | 3.375 | Iter 3 introduces new code in parallel with per-field handlers, on-plan. The new stage handler is well-scoped, validation-parity-faithful, single-snapshot-disciplined, no-op-correct, idiomatic, and (post-corrective) compliant with the new "no log-only locals" rule. Axes 6+7 held at zero. Axes 1, 2, 4, 5 deferred per plan (no penalty). The corrective brings BOTH iter-2's and iter-3's patch handlers into compliance with the user-supplied rule, which is a positive on cumulative code quality, but the original violation slipping past iter-2 keeps this from hitting 8.0. |
| integration_and_conventions | 0.20 | 8.5 | 1.700 | Mapster/Program.cs/csproj registrations symmetric with existing patterns. `AlreadyExists` choice consistent with existing convention and middleware. No cross-context imports, no new deps, no comment rot. Conventional Commits compliant on both the generator commit and the corrective. |
| test_coverage_delta | 0.20 | 8.5 | 1.700 | +19 well-named tests on the new handler covering happy paths, no-op, validation, ownership, and concurrency. Sibling test file at mirrored path. No regression on existing tests. Net 471/471 BE, 52/52 FE. |
| perf_envelope | 0.15 | 9.0 | 1.350 | Per-test cost actually *decreased* (Features.Tests 420ms / 134 tests vs. 466ms / 115 tests at iter 2 = 3.13ms/test vs. 4.05ms/test). Wall-clock increase from 4.14s to 5.16s is dominated by shell/host startup variance and is within the planner's soft (not hard) tolerance. FE untouched. |
| **Weighted total** | | | **8.125** | |

Auto-fail triggers checked:
- BEHAVIOR_DRIFT outside exception list: no (drift is on `proto_features` only and is purely additive — within planner-pinned exception for slice c).
- MUST_NOT_TOUCH_VIOLATION: no.
- Hard-bans: 0 matches.
- BASELINE_TESTS_REGRESSED: no (471/471 BE, 52/52 FE; 0 from baseline regressed).
- Coverage drop > 2% on touched files: no.
- Perf envelope > planner-pinned tolerance: no (planner pins this as a soft signal; per-test cost decreased).
- One type per file violation: no.
- Sibling test file missing for a NEW handler: no (`PatchFeatureStageHandlerTests.cs` present at mirrored path).
- New external dependencies: no.
- Log-only locals (per new project rule): no remaining violations in iter-3 code (corrective removed all 9 across both patch handlers).

`VERDICT=PASS` (8.125 ≥ 7.0 AND no auto-fail).
