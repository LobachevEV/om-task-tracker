# Generator notes — iter-004 (slice (d) gateway endpoints)

## Scope

Slice (d): collapse the per-field PATCH endpoints onto two consolidated routes at the API gateway, leaving the per-field surfaces alive (deletion is slice (f)). FE untouched.

## Changes landed

### New endpoints
- `PATCH /api/plan/features/{id}` now forks on `body.StagePlans is null`:
  - Sparse → forwards to `FeaturePatcher.Patch` (iter-2 RPC) with `title?`, `description?`, `leadUserId?`, `expectedVersion?`. `If-Match` header → `expectedVersion` (body wins on collision).
  - Bulk (existing) → `FeatureUpdater.Update` with the 5-row stagePlans body, unchanged.
- `PATCH /api/plan/features/{id}/stages/{stage}` (new controller `PatchFeatureStageController`) → forwards to `FeatureStagePatcher.Patch` (iter-3 RPC) with `stageOwnerUserId?`, `plannedStart?`, `plannedEnd?`, `expectedStageVersion?`. `If-Match` → `expectedStageVersion`. Stage segment is case-insensitive via `PlanMapper.TryParseStage`.

Both endpoints:
- Use `[Authorize(Roles = Roles.Manager)]`, no role drift.
- Return `FeatureSummaryResponse` via `PlanMapper.MapSummary` (new overloads delegate to the same `BuildSummary` private helper — surface 5 unchanged).
- Rely on existing `GrpcExceptionMiddleware` for upstream-error → HTTP mapping (no per-controller `try/catch` on `RpcException`).
- Validate roster server-side (`UserService.LoadRosterForManagerAsync`) before forwarding owner/lead changes.

### Files added (production)
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/PatchFeatureStageController.cs` (one type per file)
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Stages/PatchFeatureStagePayload.cs` (one type per file)

### Files modified (production)
- `OneMoreTaskTracker.Api/OneMoreTaskTracker.Api.csproj` — added two `<Protobuf>` entries (`patch_feature_command_handler.proto`, `patch_feature_stage_command_handler.proto`) with `Client` services.
- `OneMoreTaskTracker.Api/Program.cs` — registered `FeaturePatcher.FeaturePatcherClient` and `FeatureStagePatcher.FeatureStagePatcherClient` gRPC clients.
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeaturesController.cs` — ctor adds `FeaturePatcher` dependency; `Update` action forks; new `PatchSparseAsync` + `TryAppendStagePlans` helpers.
- `OneMoreTaskTracker.Api/Controllers/Plan/Feature/UpdateFeaturePayload.cs` — added trailing optional `int? ExpectedVersion = null` (back-compat for existing tests).
- `OneMoreTaskTracker.Api/Controllers/Plan/PlanMapper.cs` — added two using-aliases (`PatchFeatureDto`, `PatchFeatureStageDto`) and two new `MapSummary` overloads delegating to `BuildSummary` (preserves response shape surface).
- `OneMoreTaskTracker.Api/openapi.json` — additive drift only:
  - Updated `/api/plan/features/{id}` PATCH description (sparse semantics) + `If-Match` parameter + `409` response.
  - New path `/api/plan/features/{id}/stages/{stage}` PATCH (with new `PatchFeatureStagePayload` schema component).
  - New path `/api/plan/features/{id}/lead` PATCH marked `deprecated: true` (the existing FE consumed route; previously undocumented).
  - Marked `deprecated: true` on the 5 existing per-field paths: `/title`, `/description`, `/stages/{stage}/owner`, `/stages/{stage}/planned-start`, `/stages/{stage}/planned-end`. Each description prepended with "DEPRECATED — use the consolidated sparse `…`".
  - Added `expectedVersion` to `UpdateFeaturePayload`; added `PatchFeatureStagePayload` and `UpdateFeatureLeadPayload` schemas.

### Files added (tests)
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/PatchFeatureStageControllerTests.cs` — 17 tests covering: each sparse field individually, all-fields combination, no-fields no-op, If-Match header propagation, body `expectedStageVersion` precedence over header, owner-roster reject, owner < 1 reject, malformed planned-start/end, unknown stage segment, upstream `AlreadyExists` → 409, upstream `NotFound` → 404, upstream `PermissionDenied` → 403, non-Manager role → 403, unauthenticated → 401.
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/PatchFeatureSparseEndpointTests.cs` — 12 tests covering: title-only / description-only / lead-only / all-sparse forwarding, lead-not-on-roster reject, lead < 1 reject, If-Match propagation, body `expectedVersion` precedence, upstream `AlreadyExists` → 409, `NotFound` → 404, non-Manager → 403, unauthenticated → 401.

### Files modified (tests)
- `tests/OneMoreTaskTracker.Api.Tests/Infra/TasksControllerWebApplicationFactory.cs` — added `MockFeaturePatcher`, `MockFeatureStagePatcher` properties + descriptor removals + singleton registrations.
- `tests/OneMoreTaskTracker.Api.Tests/Infra/ApiWebApplicationFactory.cs` — same additions.
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/PlanControllerStagePlansTests.cs` — reshaped 3 existing tests (`UpdateFeature_StagePlansNull_RoutesToSparsePatchHandler`, `UpdateFeature_WhenCallerDoesNotOwnFeature_Returns403`, `UpdateFeature_ForwardsCallerUserIdFromJwt`) from `MockFeatureUpdater` + `UpdateFeatureRequest` to `MockFeaturePatcher` + `PatchFeatureRequest`. New `FiveRowPatchDto` helper next to existing `FiveRowUpdateDto`.

## Tests

| Project                                | Before iter 4 | After iter 4 |
|----------------------------------------|---------------|--------------|
| `OneMoreTaskTracker.Api.Tests`         | 183           | **212**      |
| `OneMoreTaskTracker.Features.Tests`    | 134           | 134          |
| `OneMoreTaskTracker.Tasks.Tests`       | 59            | 59           |
| `OneMoreTaskTracker.Users.Tests`       | 32            | 32           |
| `OneMoreTaskTracker.GitLab.Proxy.Tests`| 63            | 63           |
| **BE total**                           | 471           | **500**      |
| FE (vitest)                            | 52 files      | 52 files     |

`dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` → 0 errors, 0 warnings.
`dotnet test OneMoreTaskTracker.slnx --nologo` → 500/500 pass.

## Behavior contract drift (vs `BASELINE_SHA=935dc9af`)

Diff via `~/.claude/scripts/gan-feature/diff-behavior-contract.mjs`:

| Surface                            | Drift  | Planner-pinned exception |
|------------------------------------|--------|--------------------------|
| `openapi`                          | yes    | additive — exception 1 (planner permits openapi.json edits to reflect consolidated surface, additive-or-deletion-only; per-field paths still keyed) |
| `proto_features`                   | yes    | exception 2 — sparse PATCH protos from iter-2/iter-3 (per-field protos NOT yet deleted) |
| `db_migrations_features`           | no     | — |
| `endpoint_matrix_plan_features`    | yes    | exception 1 — new `PatchFeatureStageController` route attributes; per-field routes still present |
| `feature_summary_response_shape`   | no     | — (unchanged) |
| `planapi_exports`                  | no     | FE untouched |
| `planapi_schemas`                  | no     | FE untouched |
| `inline_editor_component_api`      | no     | FE untouched |

`MUST_NOT_TOUCH_VIOLATION = false` (`check-must-not-touch.mjs` reports 0 hits across 20 changed files).

## Decisions / deviations

- **Planner-spec endpoint structure vs. delivered shape.** Planner specified `FeaturesController.Update` accepts `title?/description?/leadUserId?` directly. Planner also specified a new `UpdateFeatureStageHandler`. I shipped iter-3's `FeatureStagePatcher` (already wired) instead of renaming to "UpdateFeatureStage", and the same goes for `FeaturePatcher` from iter-2. Functionally equivalent; naming preserved per iter-2/iter-3 work.
- **Sparse routing fork in `Update` action.** I did NOT create a separate `[HttpPatch]` action because it would collide with the existing route `PATCH /api/plan/features/{id}` (same verb, same template). Instead, `Update` forks on `body.StagePlans is null` — sparse routes through `PatchSparseAsync`, bulk falls through to the existing legacy code. This preserves the existing 5-row `stagePlans` test contract while enabling the new sparse path.
- **Per-field controllers untouched.** Per planner, slice (d) keeps `Fields/FeatureFieldsController.cs` and `Stages/FeatureStagesController.cs` alive. Slice (f) deletes them.
- **No per-field-controller-as-thin-adapter rewrite.** Planner suggested making per-field controllers "thin adapters that forward to the new sparse-PATCH paths". I left them calling their original gRPC clients directly. Rationale: rerouting would require either (a) HTTP-self-call (high latency overhead, threadpool risk) or (b) duplicating sparse-payload construction. Slice (f) deletes them anyway, so the temporary adapter pattern adds churn without buying coverage. All pre-existing per-field tests stay green.
- **`/api/plan/features/{id}/lead` documented as deprecated.** It was undocumented in the baseline `openapi.json` but lives in `Fields/FeatureFieldsController.cs`. Adding a `deprecated: true` entry is purely additive drift and aligns the openapi spec with reality before slice (f) deletes it.

## Compliance with project rules

- One type per file: 2 new files, each contains exactly one type.
- No comments referencing iter labels / contract IDs / task numbers in source.
- No log-only locals introduced (verified by reading both new files; no `var ___ = …;` exists solely to feed a log statement).
- No emoji in source/tests/openapi.json.
- `[Authorize(Roles = Roles.Manager)]` preserved on all consolidated endpoints.
- Conventional Commits message without `!` (per-field surfaces still callable; HTTP clients not breaking).

## Carry-overs (NOT addressed in iter 4)

Per dispatch — flagging only:

- **RF-001** — `Feature` setter visibility (still `public`, should be `internal` to module).
- **RF-002** — `UpdateFeatureLeadHandlerTests` gap (no test exercises the per-field lead RPC).
- **RF-004** — Bulk vs sparse handler reconcile (`UpdateFeatureHandler` vs `PatchFeatureHandler` overlap on title/description/leadUserId — slice (f) drops bulk-only path).
- **RF-005** — TS+Zod surface for sparse PATCHes (FE — slice (e)).
- **RF-006** — Process gap on log-only locals (no automated lint catches it).

## Next slice

`(e) refactor(webclient): consolidate planApi update functions and reroute Gantt inline editors` — extend `planApi.ts` with `updateFeature(id, sparsePatch, ifMatch?)` and `updateFeatureStage(featureId, stage, sparsePatch, ifMatchStageVersion?)`; reroute `useFeatureMutationCallbacks.ts`; extend `schemas.ts` with `updateFeatureStagePayloadSchema`. FE-only. Per-field shims kept for one commit.
