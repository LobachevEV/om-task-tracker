# Generator notes — iter 001

## Slice taken

Commit (a) + (c) merged: introduced FluentValidation + DI extension packages on `OneMoreTaskTracker.Tasks`, authored the per-service translator (gRPC `ValidationExceptionInterceptor` + `ValidationDetailComposer`), migrated all three Tasks validator-driven request paths to `AbstractValidator<T>` subclasses, and removed the inline guard throws from the three handlers.

## MUST-improve axes touched

- Axis 1 (`RpcException` throws inside `*Validator.cs`): unchanged at 4 (still in `FeatureValidation.cs`); Tasks now contributes 0 — no validator file in Tasks throws RpcException.
- Axis 3 (`AbstractValidator<T>` subclasses): 0 → 3 in `Tasks` (Create / Attach / Detach).
- Axis 4 (one type per file, validators): 3 / 3 — every new `*Validator.cs` declares exactly one public class.
- Axis 5 (FluentValidation package on csproj): 0 / 3 → 1 / 3 (Tasks done; Users + Features pending).
- Axis 6 (DI registration): added `AddValidatorsFromAssemblyContaining<CreateTaskRequestValidator>()` in Tasks Program.cs.
- Axis 7 (single translation site per service): added `ValidationExceptionInterceptor` for Tasks; uses planner-pinned `string.Join("; ", failures.Select(f => f.ErrorMessage))`.
- Axis 8 (build): green (0 errors, 2 pre-existing warnings).
- Axis 9 (tests): all 421 tests pass, no regressions.
- Axis 10 (sibling tests): 3 / 3 validators have `*ValidatorTests.cs` siblings under `tests/OneMoreTaskTracker.Tasks.Tests/Validation/`.

## Files touched

- 1 csproj (`OneMoreTaskTracker.Tasks.csproj`): + 2 PackageReferences.
- 1 Program.cs: interceptor + AddValidators wiring.
- 2 handlers: dropped 4 inline `throw new RpcException(...)` lines total.
- 5 new production files: 3 validators, 1 interceptor, 1 detail composer.
- 5 new test files: 3 validator unit tests, 1 `ValidationPipeline` helper, 0 new handler tests.
- 2 modified test files: 3 direct-handler validation tests rewritten to invoke through `ValidationPipeline.ValidateAsync` so they exercise the wire-level surface.

## Wire-surface preservation

All three captured Detail strings stay byte-identical: `"feature_id is required"`, `"jira_task_id is required"`, `"detach requires reassign_to_feature_id because Task.FeatureId is non-nullable"`. The `Detach` `FailedPrecondition` status code is preserved via `WithState(_ => StatusCode.FailedPrecondition)` + interceptor's `CustomState` inspection.

## Deviations from refactor-plan.md "Planned commits"

Merged commits (a) and (c) into a single commit. Commit (a) by itself would have left FluentValidation wired to nothing for Tasks; merging avoids a no-op intermediate state. The decorator/translator landed inside Tasks (not as a shared/cross-service helper) so each bounded context owns its own translation site, matching the `ValidationDetailComposer` per-service split implied by the planner's "per-service translator" axis 7.

## Out of scope this iter

- `OneMoreTaskTracker.Users` validators (commit b — iter 2).
- `OneMoreTaskTracker.Features` validators + `FeatureValidation.cs` deletion (commit d — iter 3).
- Multi-failure integration smoke tests (commit e — final iter).
