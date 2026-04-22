# Spec 05 — Task↔Feature Attachment Handlers — Feedback 001

**Mode:** code-only
**Verdict:** **PASS** (weighted total **9.58 / 10**, threshold 7.0)

## Dimension scores

| Dimension | Weight | Raw | Weighted |
|-----------|--------|-----|----------|
| Design        | 0.15 | 9.5  | 1.425 |
| Originality   | 0.15 | 9.0  | 1.350 |
| Craft         | 0.20 | 9.0  | 1.800 |
| Functionality | 0.50 | 10.0 | 5.000 |
| **Total**     | 1.00 |      | **9.575** |

No caps triggered (F1 green, F3 green, idempotency test present, single `MapGrpcService`).

## Functionality checks

| # | Check | Result |
|---|-------|--------|
| F1 | `dotnet build OneMoreTaskTracker.Tasks.csproj` | ✓ 0 warn / 0 err |
| F2 | `dotnet build` (solution) | ✓ 0 warn / 0 err, all 7 projects |
| F3 | `dotnet test OneMoreTaskTracker.Tasks.Tests --no-build` | ✓ 59 / 59 passed |
| F4 | `rg "task\.FeatureId\s*="` outside `Task.cs` | ✓ zero hits |
| F5 | `TaskFeatureLinker|AttachTaskToFeatureHandler` in `Program.cs` | ✓ exactly 1 `MapGrpcService<AttachTaskToFeatureHandler>()` |
| F6 | Attach handler test facts present | ✓ 6 / 6 |

### F6 fact-by-fact

- Unknown `jira_task_id` → `NotFound` — `Attach_UnknownJiraTaskId_ThrowsNotFound` ✓
- `feature_id == 0` → `InvalidArgument` — `Attach_FeatureIdZero_ThrowsInvalidArgument` ✓ (plus `Detail` contains "feature_id")
- Idempotent attach, no changes — `Attach_AlreadyAttachedToTarget_IsIdempotent_NoChanges` asserts `db.ChangeTracker.HasChanges() == false` ✓
- Happy attach — `Attach_HappyPath_ChangesFeatureIdAndReturnsNewId` ✓
- Detach without reassign → `FailedPrecondition` — `Detach_WithoutReassign_ThrowsFailedPrecondition` ✓
- Detach with valid reassign → happy — `Detach_WithValidReassign_MovesTaskToTargetFeature` ✓

## Design (9.5)

- `TaskFeatureLinker` service with both `Attach` + `Detach` RPCs on a single handler class, per §§32–35, §180.
- Request/response shapes exactly match spec §§37–57.
- Idempotency: `if (task.FeatureId != request.FeatureId)` guards `SaveChangesAsync` — spec §190 satisfied.
- `Detach` without `reassign_to_feature_id` → `FailedPrecondition` (§192).
- Unknown jira → `NotFound`, `feature_id == 0` → `InvalidArgument`.

Minor: `Detach` also rejects `ReassignToFeatureId <= 0` (not just `== 0`), which is stricter than the literal spec wording but consistent with `Attach`'s guard — counts as defensive, not a defect.

## Originality (9.0)

- Primary ctor: `public class AttachTaskToFeatureHandler(TasksDbContext db) : TaskFeatureLinker.TaskFeatureLinkerBase` — matches spec §92 verbatim, no `Impl` split.
- `Task.AttachToFeature(int)` guarded with `ArgumentOutOfRangeException`, FeatureId is `{ get; private set; }` (form A from spec §165).
- One `MapGrpcService<AttachTaskToFeatureHandler>()` call in `Program.cs:82` — no duplicate for `Detach` (would have been an Originality −2 cap).
- `<Protobuf>` csproj entry matches spec §§70–78 literally. Note it's *structurally simpler* than the other `<Protobuf>` entries in `OneMoreTaskTracker.Tasks.csproj` (no `CompileOutputs`/`OutputDir`/`Generator` noise), but those extras are MSBuild defaults and compilation is green — spec wins over consistency here.

## Craft (9.0)

- `Task.FeatureId` is `{ get; private set; }` — chose the non-`required` variant. Compiles; existing `CreateTaskHandler` and seed code were updated to use `AttachToFeature` instead of object initializer (correct — `private set` is class-scoped and not reachable via object initializer outside the declaring type).
- `CreateTaskHandler.cs:29` — `task.AttachToFeature(request.FeatureId);` after `new Task { … }` construction. Clean.
- `AttachToFeature` is the **only** non-EF mutation path confirmed by `rg "FeatureId\s*="` across the repo — hits are all on proto-generated types or the single assignment inside `AttachToFeature` itself. Spec §202 acceptance criterion met.
- `Detach` delegates to `Attach` by building an `AttachTaskToFeatureRequest` — single code path (§193).
- `TaskTestExtensions.WithFeature(int)` is a pleasant touch: avoids leaking `AttachToFeature` into every test.

Minor friction:
- Idempotency is asserted via `db.ChangeTracker.HasChanges()` rather than a `SaveChangesAsync` spy. InMemory provider + this assertion is a valid proxy but couples the test to EF internals. Acceptable per §190 which offered both.
- `Task.cs:5` uses `using Task = System.Threading.Tasks.Task;` aliasing in the handler — avoids the domain `Task` clash. Slightly noisy but unavoidable in this module.

## Top issues (non-blocking)

1. **`<Protobuf>` csproj entry diverges from sibling entries’ style.** The new entry omits `CompileOutputs` / `OutputDir` / `Generator`. Matches spec text but creates visual inconsistency with the other 8 `<Protobuf>` items. Consider aligning for future maintenance (−0 to Functionality, cosmetic).
2. **Idempotency assertion via `ChangeTracker.HasChanges()`** rather than a NSubstitute spy on `SaveChangesAsync`. Works correctly but won't catch a regression where someone calls `SaveChangesAsync` unconditionally and EF happens to no-op because the entity is unchanged. A spy would be stricter. Minor.
3. **`Detach` rejects `ReassignToFeatureId <= 0`** (spec §132 only specifies `== 0`). Harmless and arguably correct, but worth noting the stricter-than-spec guard.
4. **`FeatureId` is not `required`.** Means `new Task { … }` without a feature compiles, defaulting `FeatureId = 0`, and only `AttachToFeature` promotes it to a real value. Relies on call sites to always call `AttachToFeature`. `CreateTaskHandler` does; tests that skip it leave `FeatureId = 0`. Consider `public required int FeatureId { get; private set; }` in a follow-up — compile-time safety net against orphaned inserts. Not a defect for this spec since spec §165 explicitly allowed either variant.

## Summary

Clean, spec-faithful implementation. Build and test suites are green, all six rubric facts are covered, `AttachToFeature` is the sole mutation path, and the handler uses a single `MapGrpcService` for both RPCs. Ship it.
