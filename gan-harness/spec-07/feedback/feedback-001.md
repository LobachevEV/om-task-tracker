# Spec 07 — Plan gateway REST — Eval feedback-001

**Mode:** code-only
**Verdict:** **PASS**
**Weighted total:** **9.28 / 10** (threshold 7.0)

## Scores

| Axis          | Weight | Score | Weighted |
|---------------|--------|-------|----------|
| Design        | 0.15   | 9.5   | 1.425    |
| Originality   | 0.15   | 9.0   | 1.350    |
| Craft         | 0.20   | 7.5   | 1.500    |
| Functionality | 0.50   | 10.0  | 5.000    |
| **Total**     |        |       | **9.275** |

No caps triggered:
- F1 green → no F cap.
- F3 all pass → no F cap.
- `managerUserId` is overridden server-side (`PlanController.cs:136` assigns `User.GetUserId()` unconditionally) → Craft not capped.
- `DetachTask` returns 422 when body null or `ReassignToFeatureId <= 0` (`PlanController.cs:209-210`) → Design not capped.

---

## Design — 9.5

- All six routes present with correct verbs/paths:
  `GET /api/plan/features`, `GET /api/plan/features/{id:int}`, `POST /api/plan/features`,
  `PATCH /api/plan/features/{id:int}`, `POST /api/plan/features/{id:int}/tasks/{jiraId}`,
  `DELETE /api/plan/features/{id:int}/tasks/{jiraId}`.
- `[ApiController]` + `[Authorize]` at class level; `[Authorize(Roles = Roles.Manager)]` on POST/PATCH/Attach/Detach (lines 128, 156, 181, 202).
- DTO records all present and shape-matched: `FeatureSummaryResponse`, `FeatureDetailResponse`, `AttachedTaskResponse`, `MiniTeamMemberResponse`, `CreateFeaturePayload`, `UpdateFeaturePayload`, `DetachTaskBody`.
- `FeatureState` serialised as plain string via `MapState` switch mirroring `TasksController.MapState`.
- Validation attrs correctly applied on payload records.

Minor: `[HttpDelete]` endpoint uses `[FromBody] DetachTaskBody?` (nullable) — correct for the "missing body → 422" branch but slightly unusual vs spec's non-nullable `DetachTaskBody`. Acceptable deviation because it's the only way to inspect "no body at all" without `ApiController` auto-400.

## Originality — 9.0

- Composition pattern (DI via primary ctor, `[Route("api/plan")]`, `GetTeamMemberIds` helper) mirrors `TasksController` cleanly.
- `MapState` inline switch + `LogAndReturnUnknown` echoes the Tasks pattern exactly.
- Program.cs registers **5 new gRPC clients** (FeatureCreator, FeatureUpdater, FeaturesLister, FeatureGetter, TaskFeatureLinker) — ✓ spec §190-198.
- `GrpcExceptionMiddleware` already contained `FailedPrecondition → 422` mapping (line 23) — spec §126 satisfied. The middleware test theory covers it (`GrpcExceptionMiddlewareTests.cs:48`).

## Craft — 7.5

Positives:
- `CreateFeature` hard-codes `managerUserId = User.GetUserId()` (line 136) — client `managerUserId` payload is ignored; test `CreateFeature_AsManager_UsesCallerIdAsManagerUserId` proves it (sends `managerUserId = 9999`, asserts captured request = callerId 77).
- `AttachTask` gates on `featureGetter.GetAsync` (lines 190-192) before linking — opaque FK invariant upheld; `NotFound` propagates via middleware (test `AttachTask_WhenFeatureNotFound_Returns404`).
- `DetachTask` returns 422 for both null body and `ReassignToFeatureId <= 0` (line 209).
- `CancellationToken ct` threaded through every gRPC call (`cancellationToken: ct`).
- `LeadUserId` defaults to current user when missing or ≤ 0.

Concerns:
- **`ListFeatures`** always calls `featuresLister.ListAsync` with `ManagerUserId = userId` regardless of caller's role. For non-Managers this is likely wrong semantically (they'll get empty lists or behave as "their own manager"). Spec §110 says "any logged-in" can list with `scope=all|mine`, but the gRPC filter used here bakes in the caller as manager. A role-aware dispatch (e.g. omit `ManagerUserId` for non-Managers, or use `scope`) would be cleaner. **Not a cap trigger**, but flagged.
- **`UpdateFeature`** sends empty strings / zero ints when fields are absent from a sparse PATCH (lines 168-173). This pushes all "field present vs absent" disambiguation onto the UpdateFeature handler; if that handler does not treat empty strings / 0 as "unchanged", partial updates will silently clobber columns. This is a contract risk with spec 03 but out of scope for this controller.
- `GetFeature` composes `miniTeamIds` from `attachedTasks`, but `attachedTasks` is hard-coded empty (see degradation note). Net effect: `miniTeam` is always `[]`. Documented via inline comments.
- `LoadRosterForManager` swallows `RpcException` and returns an empty dict with `LogWarning` — resilient, but hides `PermissionDenied` from the caller. Low risk.

## Functionality — 10.0

| Check | Result |
|---|---|
| F1 `dotnet build OneMoreTaskTracker.Api` | ✅ 0 errors / 0 warnings |
| F2 `dotnet build` (whole solution) | ✅ 0 errors / 0 warnings |
| F3 `dotnet test OneMoreTaskTracker.Api.Tests --no-build` | ✅ **127 passed, 0 failed** |
| F4 `PlanControllerTests` coverage | ✅ **8 test methods** covering: anonymous→401, Qa→403 create, Manager→200 id=321 + managerUserId override, attach missing feature→404, detach missing body→422, detach zero reassignId→422, detach valid body→200, list features summary |
| F5 `FailedPrecondition` in middleware | ✅ 1 occurrence (line 23) |
| F6 `FeaturesService:Address` references | ✅ 2 in `Program.cs` (lines 72-73) + 1 in `appsettings.json` = 3 total |
| F7 `<Protobuf` entries in Api.csproj | ✅ 13 total; pre-existing 7 (Users + 6 Tasks: task_state, CreateTask, ListTasks, GetTask, MoveTask, TaskAggregate) + **6 new** (Features feature_state + CreateFeature + UpdateFeature + ListFeatures + GetFeature + Tasks AttachTask) — exactly matches expectation |

Test file fixture `TasksControllerWebApplicationFactory` was extended with `MockFeatureCreator/Updater/Getter/Lister` and `MockTaskFeatureLinker` and registers them into DI (`:45-57, :109-113`) — correct wiring.

---

## Top issues

1. **[P3] `ListFeatures` always filters by `ManagerUserId = userId`** regardless of caller role (PlanController.cs:44-46). Non-Manager callers may silently receive empty or incorrect lists. Consider branching on `role == Roles.Manager` like `GetTeamMemberIds` already does. Spec §110 is ambiguous — worth clarifying at spec level.
2. **[P3] Sparse PATCH leakage** — `UpdateFeature` translates missing fields to `string.Empty` / `0`, relying on the Features handler to interpret those as "unchanged". If spec 03's handler treats empty strings as "clear this column", a partial PATCH will destructively blank `Title`/`Description`/`PlannedStart`/`PlannedEnd`. Consider wire-level `optional` fields or a presence-flag DTO.
3. **[P4] `LoadRosterForManager` swallows `RpcException`** into a warning + empty roster. This hides upstream auth failures from callers. Acceptable for graceful-degradation but worth a TODO.
4. **[P4] `GetFeature` never populates `Tasks` or `MiniTeam`** — both are always empty. Documented via inline comments tied to the taskCount/taskIds degradation below. Downstream UX consequence: feature detail view will look "empty" until the proto gap is closed.

---

## Follow-up: taskCount / taskIds / tasks degradation (spec-level)

The generator correctly flagged that `ListTasksRequest` / `TaskDto` (in `list_tasks_query_handler.proto`) have no `feature_id` field, so the controller cannot compute per-feature `taskCount` / `taskIds` nor populate `AttachedTaskResponse[]` for `GetFeature`. Current behaviour:

- `ListFeatures` → every `FeatureSummaryResponse.TaskCount = 0`, `TaskIds = []`.
- `GetFeature` → `FeatureDetailResponse.Tasks = []`, `MiniTeam = []` (because `MiniTeam` is derived from attached tasks).

This is documented with inline comments at `PlanController.cs:69-74` and `:106-112`, referencing spec 07 §110-112 which anticipated this gap. **Not penalised per eval instructions.**

**Recommended follow-up spec:** extend `list_tasks_query_handler.proto` with `optional int32 feature_id = N;` on both `ListTasksRequest` (filter) and `TaskDto` (projection) so the composition in `ListFeatures`/`GetFeature` can honour the `tasks`/`miniTeam` shape. Alternatively add a dedicated `GET /features/with-counts` RPC on the Features service (spec 07 §110 suggested this path).
