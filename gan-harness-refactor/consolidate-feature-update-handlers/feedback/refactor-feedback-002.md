# Refactor feedback — iter 002

Track: fullstack
Generator commit: `402b1f5c592afadb9a204a38c5765f4d76eb2bf5`
Previous gen commit: `ea45d57c15adf2e9c7ce00556c426b4a6b487512`
Baseline commit: `935dc9af224333e382e31d161a9a8eca9126ccfa`

Slice taken (per dispatch): introduce a sparse-field `PatchFeatureCommand` proto + `PatchFeatureHandler` in PARALLEL with the existing per-field handlers. Gateway and FE are deliberately untouched in this iteration.

## 1. Behavior-preservation gate

**`BEHAVIOR_DRIFT=false`** (after applying the planner's iter-2 migration-parity exception for surface 2).

`diff-behavior-contract.mjs` output:

```
{"BEHAVIOR_DRIFT":true,"diffs":[{"id":"proto_features","evidence":"text differs (438→474 lines, 15551→16618 bytes)"}],"evidence":{"openapi":"no diff","proto_features":"text differs (438→474 lines, 15551→16618 bytes)","db_migrations_features":"no diff","endpoint_matrix_plan_features":"no diff","feature_summary_response_shape":"no diff","planapi_exports":"no diff","planapi_schemas":"no diff","inline_editor_component_api":"no diff"}}
```

The script reports drift on `proto_features`. I structurally diffed the baseline vs. iter-2 capture and verified the change is **purely additive**:

- Existing per-field proto files (`UpdateFeatureCommand`, `UpdateFeatureTitleCommand`, `UpdateFeatureDescriptionCommand`, `UpdateFeatureLeadCommand`, `UpdateStageOwnerCommand`, `UpdateStagePlannedStartCommand`, `UpdateStagePlannedEndCommand`) and the shared `feature_stage_plan.proto` / `feature_state.proto` remain byte-identical.
- One new file appended at `./PatchFeatureCommand/patch_feature_command_handler.proto` defining `service FeaturePatcher` + `PatchFeatureRequest` + `FeatureDto`.
- No existing message had a field number changed, renamed, or reserved.

This matches the dispatch prompt's iter-2 exception ("Surface 2 (proto_features): ADDITIVE drift permitted (new RPC, new message)"). The gate is satisfied. The other 7 surfaces are byte-identical (`openapi`, `db_migrations_features`, `endpoint_matrix_plan_features`, `feature_summary_response_shape`, `planapi_exports`, `planapi_schemas`, `inline_editor_component_api`).

## 2. MUST-NOT-touch gate

`MUST_NOT_TOUCH_VIOLATION=false`. `check-must-not-touch.mjs` returns `{"MUST_NOT_TOUCH_VIOLATION":false,"offending_files":[],"patterns":[]}`. The 6 touched files are entirely under `OneMoreTaskTracker.Features/` and `tests/OneMoreTaskTracker.Features.Tests/`; no edits to `OneMoreTaskTracker.{Users,Tasks,GitLab.Proxy}/`, no `compose.yaml` / `appsettings*.json` / Dockerfile / `nuget.config` / untracked PNG diffs.

Notably, no edits leaked into `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields/` or `Stages/` (slice (d)) and no edits leaked into `OneMoreTaskTracker.WebClient/` (slice (e)). Scope is clean.

## 3. Hard-bans scan

`scan-hard-bans.mjs` against the three new/modified files (handler `.cs`, proto, tests) returns `{"matches":[],"auto_fail":false}` for each. The CSS/font hard-bans are FE-only and irrelevant to this BE-only slice.

## 4. Baseline-test regression gate

`BASELINE_TESTS_REGRESSED=false`.

I ran the suites at HEAD myself (the baseline manifest's `generic` parser still can't structure dotnet output, so I parsed the per-project lines):

- `OneMoreTaskTracker.GitLab.Proxy.Tests`: 63 / 63 (108 ms)
- `OneMoreTaskTracker.Tasks.Tests`: 59 / 59 (426 ms)
- `OneMoreTaskTracker.Features.Tests`: **115 / 115** (was 98 at iter 1; +17 new `PatchFeatureHandlerTests`) (466 ms)
- `OneMoreTaskTracker.Api.Tests`: 183 / 183 (565 ms)
- `OneMoreTaskTracker.Users.Tests`: 32 / 32 (2 s)
- **Total: 452 / 452** (was 435 at iter 1; +17; 0 regressed; 0 failed)

FE: `npm --prefix OneMoreTaskTracker.WebClient test -- --reporter=tap` → 52 test files, all green, identical to baseline (FE source untouched in iter 2).

Generator's `dotnet test 452/452` and `npm test 52/52` claims verified.

## 5. MUST-improve axes — per-axis re-check

Source-of-truth commands re-run at HEAD (`402b1f5c`):

| # | Axis | Baseline | Target | At HEAD | Status | Notes |
|---|------|----------|--------|---------|--------|-------|
| 1 | Per-field Feature handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). On-plan for iter 2. |
| 2 | Per-field Stage handlers | 3 | 0 | 3 | DEFERRED | Plan: lands in commit (f). On-plan for iter 2. |
| 3 | Total handler files in `Features/Update/` | 7 | ≤ 2 | **8** | DEFERRED (climbed +1 by design) | Slice (b) introduces `PatchFeatureHandler.cs` in parallel; per-field handlers will be deleted in slice (f). On-plan. |
| 4 | Per-field PATCH endpoints | 6 | 1 | 6 | DEFERRED | Plan: lands in commit (d)/(f). On-plan. |
| 5 | FE per-field PATCH exports | 6 | 0 | 6 | DEFERRED | Plan: lands in commit (e)/(f). On-plan. |
| 6 | `feature.Version|UpdatedAt =` outside `Feature.cs` | 13 | 0 | **0** | HELD | Iter 1 met; new `PatchFeatureHandler` does not regress (uses `feature.RenameTitle/SetDescription/AssignLead` aggregate methods). |
| 7 | `plan.Version|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 | **0** | HELD | Iter 1 met; iter 2 doesn't touch stage plans. |
| 8 | BE tests passing | 419 | ≥ 419, 0 regressed | **452** | MET (+33 vs. baseline; +17 vs. iter 1) | All green. |
| 9 | FE tests passing | 52 | ≥ 52, 0 regressed | 52 | MET | FE untouched. |
| 10 | Sibling test file per `*Handler.cs` | n/a (gaps existed at baseline) | 0 missing for **new** handlers | 0 missing for new handler | NEUTRAL/MET | `PatchFeatureHandler.cs` has its sibling `PatchFeatureHandlerTests.cs` at the mirrored source-tree path. Pre-existing `UpdateFeatureLeadHandlerTests.cs` gap (RF-002) untouched, retires in slice (f). |

**Headline**: axis 3 ticks +1 (7→8) by design — the new sparse handler ships in parallel before the per-field handlers retire. Axes 6, 7 held at zero through the new handler (validation: PatchFeatureHandler routes through aggregate methods, no direct `feature.Version =` or `feature.UpdatedAt =` assignments). The cumulative rubric still credits the iter-1 invariant move.

## 6. Code-quality review of the iter-2 delta

### What's good

- **`AlreadyExists` for concurrency conflict is consistent.** `OneMoreTaskTracker.Api/Middleware/GrpcExceptionMiddleware.cs:43` maps `StatusCode.AlreadyExists → (409, "Resource already exists")`, and lines 86–89 explicitly carve out `AlreadyExists` + `FailedPrecondition` for conflict-envelope passthrough. Every existing per-field update handler in this service throws `RpcException(AlreadyExists, ConflictDetail.VersionMismatch(...))` (`UpdateFeatureTitleHandler`, `UpdateFeatureDescriptionHandler`, `UpdateFeatureLeadHandler`, `UpdateStageOwnerHandler`, `UpdateStagePlannedStartHandler`, `UpdateStagePlannedEndHandler`). The new `PatchFeatureHandler` follows the same convention verbatim. No semantic clash with duplicate-key conflicts (which would be `FailedPrecondition` here).
- **No-op semantics are correctly implemented.** The handler uses an `anyMutation` flag set inside each `if (request.HasX)` branch. When no field is present, the flag stays false and the entire `if (anyMutation) { SaveChangesAsync; logger.LogInformation; }` block is skipped. Aggregate methods (`feature.RenameTitle`, etc.) are NOT called on absent fields. Result: no `Version` bump, no `UpdatedAt` mutation, no DB round-trip. This matches REST PATCH semantics and is verified by `Patch_NoFields_ReturnsCurrentSnapshotWithoutBumpingVersion`.
- **Single-snapshot `DateTime.UtcNow` faithfully threaded.** `PatchFeatureHandler.cs:60` reads `var now = DateTime.UtcNow;` once, and lines 65/71/77 thread the same `now` through `feature.RenameTitle(trimmedTitle!, now)`, `feature.SetDescription(normalizedDescription, now)`, and `feature.AssignLead(request.LeadUserId, now)`. The "monotonic UpdatedAt across multi-field patch" invariant is explicit and is pinned by `Patch_AllThreeFieldsAtOnce_BumpsVersionByThreeWithSingleUpdatedAtSnapshot`.
- **Validation parity with per-field handlers is verbatim.**
  - Title: `(request.Title ?? string.Empty).Trim()`, length 0 → `InvalidArgument "title is required"`, length > `TitleMaxLength=200` → `InvalidArgument "title too long"`. Identical to `UpdateFeatureTitleHandler` lines 20–24.
  - Description: `request.Description ?? string.Empty`, length > `DescriptionMaxLength=4000` → `InvalidArgument "description too long"`, then `TrimEnd()` + `IsNullOrWhiteSpace ? null : trimmed`. Identical to `UpdateFeatureDescriptionHandler` lines 22–26.
  - Lead: `request.LeadUserId <= 0` → `InvalidArgument "lead_user_id is required"`. Identical to `UpdateFeatureLeadHandler` lines 18–19.
  - Caller: `request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId` → `PermissionDenied "Not the feature owner"`. Identical wording to per-field handlers.
- **`DbUpdateConcurrencyException` second-chance handling.** Even though the in-handler `expected_version` check fires first, the post-`SaveChangesAsync` catch block (lines 87–91) reloads the entity and rethrows `AlreadyExists` with the fresh version — same defense as per-field handlers. Important for the EF Core RowVersion path the project uses (`FeaturesDbContext.cs:25` notes this is the catch-and-translate convention).
- **One type per file.** `grep -E '^(public|internal) (class|record|interface|enum|struct) ' PatchFeatureHandler.cs PatchFeatureHandlerTests.cs` returns one match each. No `*Models.cs` aggregator.
- **No comment rot.** `grep -nE 'iter[ -]?[0-9]|RF-[0-9]+|TODO|FIXME|axis [0-9]|contract section|§'` against all three new/modified files: zero matches.
- **Sibling test file at the mirrored path.** Per RF-003 carry-over, `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureHandlerTests.cs` mirrors `OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs`. Sets the convention going forward (the iteration that reshapes the existing flat `*HandlerTests.cs` files should choose this layout).
- **proto3 `optional` codegen verified.** `obj/Debug/net10.0/PatchFeatureCommand/PatchFeatureCommandHandler.cs` exposes `HasExpectedVersion`, `HasTitle`, `HasDescription`, `HasLeadUserId` accessors — matches the pattern `UpdateFeatureTitleRequest.HasExpectedVersion` already uses elsewhere. `dotnet build` is green (0 warnings, 0 errors).
- **Mapster registration is symmetric.** `FeatureMappingConfig.cs` adds one new `TypeAdapterConfig<Feature, PatchDto>.NewConfig()` block at the tail of `RegisterFeatureToCommandFeatureDtoMappings()`, byte-identical in shape to the seven existing per-command registrations. Doesn't shadow any other `Feature → FeatureDto` target — Mapster keys on the destination type, and `PatchDto` is the per-namespace `FeatureDto` from `Proto.Features.PatchFeatureCommand`, distinct from the others.
- **`Program.cs` service mapping.** One new line `app.MapGrpcService<PatchFeatureHandler>();` appended after the six existing per-field/bulk handlers. No reordering, no breaking the existing service mappings.
- **csproj entry symmetric.** New `<Protobuf Include="Protos\PatchFeatureCommand\patch_feature_command_handler.proto">` block has the same `<GrpcServices>Server</GrpcServices>`, `<Access>Public</Access>`, `<ProtoRoot>Protos</ProtoRoot>`, `<AdditionalImportDirs>Protos</AdditionalImportDirs>` as every other Protobuf entry.
- **17 well-named tests.** Coverage matrix:
  - Title-only / description-only / lead-only happy paths (Version+1).
  - All-three-at-once (Version+3, single timestamp).
  - No-op (no Version bump, no UpdatedAt bump, no `SaveChanges`).
  - Title trim, empty title, too-long title.
  - Too-long description, blank-to-null description.
  - LeadUserId zero → InvalidArgument.
  - Unknown id → NotFound.
  - Caller-not-owner → PermissionDenied.
  - Missing caller → PermissionDenied.
  - Stale `expected_version` → AlreadyExists with conflict marker.
  - Absent `expected_version` → no concurrency check.
  - StagePlans collection preserved in response.

### Issues / risks for the next iteration (carry-overs)

- **`RF-001` (LOW, deferred — unchanged).** Public `{ get; set; }` setters on `Feature.UpdatedAt` / `Feature.Version` and `FeatureStagePlan.{UpdatedAt,Version}` still allow direct mutation. The grep-based axes 6, 7 stay at zero so the gate is met for the update path. Tighten to `private set` after the consolidated handler surface lands (slice (f)), at the same time as migrating `CreateFeatureHandler` and `DevFeatureSeeder`.
- **`RF-002` (LOW, pre-existing — unchanged).** `UpdateFeatureLeadHandler.cs` still has no sibling. Retires when slice (f) deletes the per-field lead handler.
- **`RF-003` (LOW, partially addressed).** Iter 2 puts the new test file at the mirrored source-tree path (`tests/.../Features/Update/PatchFeatureHandlerTests.cs`) — consistent with iter 1's `Features/Data/` choice and inconsistent with the existing flat handler-tests in `tests/OneMoreTaskTracker.Features.Tests/`. The convention is now firmly "mirror source tree". The iteration that reshapes the existing flat `*HandlerTests.cs` files should move them under `tests/.../Features/Update/`.
- **`RF-004` (NEW, MEDIUM).** The bulk `UpdateFeatureHandler.cs` now coexists with the new `PatchFeatureHandler.cs`. Both target `PATCH`-shaped intent on the Feature aggregate but with different semantics (UpdateFeatureHandler is the create-or-replace bulk path that does NOT bump Version per call, per iter-1 review; PatchFeatureHandler is the sparse-PATCH that bumps Version per present field). Slice (f)'s "delete dead per-field surfaces" must reconcile this — either (a) keep both with crisp semantic boundaries (bulk-replace vs. sparse-patch) and rename for clarity, or (b) fold UpdateFeatureHandler's call sites into PatchFeatureHandler if they're truly dead. The plan currently keeps `UpdateFeatureHandler`; double-check before slice (f) ships that no remaining gateway call site requires the bulk-replace `Touch`-without-bump semantic. If it's still needed (e.g. for the bulk `stage_plans[]` upsert), keep both and document the boundary.
- **`RF-005` (NEW, LOW).** Slice (e) will need to add a sparse-PATCH TS type + Zod schema in `OneMoreTaskTracker.WebClient/src/common/api/planApi.ts` (and/or `schemas.ts`). The `planapi_schemas` and `planapi_exports` surfaces should grow ADDITIVELY in slice (e) and DELETE the per-field surfaces only in slice (f) — the iter-2 capture for these surfaces is byte-identical to baseline today, which is correct.
- **Scope-overrun watch (NOT a finding).** The dispatch prompt warned that any iter-2 change under `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Fields/` is scope creep; verified zero edits there. Same for FE.

### What didn't need fixing

- The handler's `await db.Entry(feature).ReloadAsync` in the `DbUpdateConcurrencyException` catch is intentional — it refreshes the in-memory copy so the conflict response carries the *current* server version, matching the per-field handlers. Don't be tempted to skip this just because the in-handler `expected_version` pre-check usually fires first; concurrent writers can still race past it.
- The `dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature))` line follows the pattern from every other per-field handler. Mapster doesn't auto-project the navigation collection (intentional — `BuildProtoStagePlans` performs the sort-by-stage and string-formatting that EF Core can't).

## 7. Integration and conventions

- **No new utilities, no new dependencies.** Zero new NuGet packages, zero new npm packages.
- **Imports stay within bounded context.** All edits live in `OneMoreTaskTracker.Features/`. No cross-context imports added; no new east-west calls; no Users-service / Tasks-service references.
- **No new `TODO` / `FIXME`** in the iter-2 delta.
- **Conventional Commits compliant.** Commit message: `refactor(features): introduce sparse-field PatchFeatureCommand handler in parallel`. The `refactor(features):` prefix is correct. Slice (f) will need `refactor!(features):` per the planner.
- **Lint clean** (BE has no separate lint step; `dotnet build` succeeds with 0 warnings, 0 errors).

## 8. Coverage delta

LCOV not captured at baseline, so percentage coverage is N/A. Test-count delta on the new file: `PatchFeatureHandler.cs` → `PatchFeatureHandlerTests.cs` with 17 tests covering all four request paths (Has{Title,Description,LeadUserId,ExpectedVersion}), validation branches, and ownership/concurrency error branches. The auto-fail trigger ">2% drop on a touched file" cannot fire — no touched file lost coverage; the new handler is born with 17 tests covering its branches.

`COVERAGE_DELTA_PCT=0` (proxy: no regression observed; positive proxy via +17 invariant tests on the new file).

## 9. Perf envelope

`/usr/bin/time dotnet test OneMoreTaskTracker.slnx --nologo` total wall: **4.14s** at HEAD (vs. iter-1 baseline 4.25s) — well within the soft +10% cap. The +17 in-memory unit tests in `Features.Tests` actually closed the gap slightly. `PERF_ENVELOPE_OK=true`.

No FE bundle delta (FE source untouched).

## 10. Per-issue carry-overs for next iteration

- **`RF-001`** (carry over from iter 1). Tighten setter visibility on `Feature.{UpdatedAt,Version}` and `FeatureStagePlan.{UpdatedAt,Version}`. Schedule for slice (f).
- **`RF-002`** (carry over from iter 1). Pre-existing missing `UpdateFeatureLeadHandlerTests.cs`. Retires in slice (f) when the lead handler is deleted.
- **`RF-003`** (partially addressed). The iter-2 test file confirms the "mirror source tree" convention. When slice (e)/(f) reshapes existing flat `*HandlerTests.cs` files, move them under `tests/OneMoreTaskTracker.Features.Tests/Features/Update/`.
- **`RF-004`** (NEW, MEDIUM). Reconcile the bulk `UpdateFeatureHandler.cs` with the new `PatchFeatureHandler.cs` before slice (f) ships the deletion. Decide whether to keep both with crisp boundaries or fold one into the other.
- **`RF-005`** (NEW, LOW). Slice (e) must add a TS type + Zod schema for the sparse-PATCH payload in `planApi.ts` / `schemas.ts` ahead of slice (f) so generated/declared types stay in sync with the new gRPC contract.

## 11. Score breakdown

Weights from `~/.claude/agents/GAN-FEATURE-SHARED.md` §"Scoring rubrics" → `### Refactor`:

| Criterion | Weight | Score | Weighted | Rationale |
|-----------|--------|-------|----------|-----------|
| code_quality_delta | 0.45 | 7.5 | 3.375 | Iter 2 introduces new code in parallel with per-field handlers, on-plan. The new handler is well-scoped, validation-parity-faithful, single-snapshot-disciplined, no-op-correct, and idiomatic. Axes 6+7 held at zero. Axes 1–5 deferred per plan (no penalty). |
| integration_and_conventions | 0.20 | 8.5 | 1.700 | Mapster/Program.cs/csproj registrations symmetric with existing patterns. `AlreadyExists` choice consistent with existing convention and middleware. No cross-context imports, no new deps, no comment rot. |
| test_coverage_delta | 0.20 | 8.5 | 1.700 | +17 well-named tests on the new handler covering happy paths, no-op, validation, ownership, and concurrency. Sibling test file at mirrored path. No regression on existing tests. |
| perf_envelope | 0.15 | 9.0 | 1.350 | 4.14s vs. 4.25s iter-1 baseline; FE untouched. No regression. |
| **Weighted total** | | | **8.125** | |

Auto-fail triggers checked:
- BEHAVIOR_DRIFT outside exception list: no (drift is on `proto_features` only and is purely additive — within planner-pinned exception).
- MUST_NOT_TOUCH_VIOLATION: no.
- Hard-bans: 0 matches.
- BASELINE_TESTS_REGRESSED: no (452/452 BE, 52/52 FE).
- Coverage drop > 2% on touched files: no.
- Perf envelope > 10% regression: no (4.14s vs. 4.25s = -2.6%).
- One type per file violation: no.
- Sibling test file missing for a NEW handler: no.
- New external dependencies: no.

`VERDICT=PASS` (8.125 ≥ 7.0 AND no auto-fail).
