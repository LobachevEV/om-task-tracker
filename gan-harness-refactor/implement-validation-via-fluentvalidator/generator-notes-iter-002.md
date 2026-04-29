# Generator notes — iter 002

## Slice taken

Commit (b): migrate `OneMoreTaskTracker.Users` to FluentValidation. Added the FluentValidation + DI extension packages, a per-service `ValidationExceptionInterceptor` + `ValidationDetailComposer` (bounded-context-owned, copied from Tasks pattern, NOT shared), and authored two `AbstractValidator<T>` subclasses for the two validator-driven gRPC requests. Removed the four request-shape inline guards from `UserServiceHandler.Register`; preserved the two state-driven throws (`AlreadyExists` for duplicate email, `InvalidArgument` for `Invalid ManagerId` lookup, `Manager not found or user is not a manager` for GetTeamRoster).

## MUST-improve axes touched

- Axis 1 (`RpcException` throws inside `*Validator.cs`): unchanged at 4 (still in `FeatureValidation.cs`); Users contributes 0.
- Axis 3 (`AbstractValidator<T>` subclasses): 3 -> 5 (Tasks 3 + Users 2).
- Axis 4 (one type per file, validators): 5/5 — every new validator file declares exactly one `public sealed class`.
- Axis 5 (FluentValidation package on csproj): 1/3 -> 2/3 (Tasks + Users; Features pending).
- Axis 6 (DI registration): added `AddValidatorsFromAssemblyContaining<RegisterRequestValidator>()` in Users `Program.cs`.
- Axis 7 (per-service translation site): added a copy of the `ValidationExceptionInterceptor` inside Users (separate bounded-context translator).
- Axis 8 (build): green, 0 warnings, 0 errors.
- Axis 9 (tests): 421 -> 437 (16 new validator tests). All green.
- Axis 10 (sibling tests): 5/5 validators have `*ValidatorTests.cs` siblings.

## Files touched

- 1 csproj (`OneMoreTaskTracker.Users.csproj`): + 2 PackageReferences.
- 1 csproj (`OneMoreTaskTracker.Users.Tests.csproj`): + 1 PackageReference (FluentValidation, for the helper).
- 1 `Program.cs`: interceptor + AddValidators wiring.
- 1 handler (`UserServiceHandler.cs`): dropped the 4 request-shape `RpcException(InvalidArgument)` throws and the `IsValidEmail` private helper.
- 4 new production files: 2 validators, 1 interceptor, 1 detail composer.
- 3 new test files: 2 validator unit tests, 1 `ValidationPipeline` helper.
- 1 modified test file (`UserServiceHandlerRegisterTests.cs`): rerouted the 8 validator-driven Register tests through `ValidationPipeline.ValidateAsync` so they exercise the wire-level surface; kept state-driven tests on `Sut.Register` directly. `UserServiceHandlerGetTeamRosterTests.cs` not modified — its 4 tests all use positive `ManagerId` values, so the new `ManagerId > 0` validator rule does not change their wire surface.

## Wire-surface preservation

- "Email and password are required" — Cascade.Stop on Email and Password rules; baseline message preserved verbatim.
- "Invalid email address" — single `Must(...)` covering both length > 254 and `MailAddress` round-trip parse failure.
- "Password must be at least 8 characters" — `MinimumLength(MinPasswordLength)` with interpolation matches baseline byte-identically (8 == MinPasswordLength).
- "Role must be one of: FrontendDeveloper, BackendDeveloper, Qa" — only fires under `When(r => r.ManagerId != 0)`, mirroring the baseline branch; security invariant (no settable role on self-registration) preserved.
- `GetTeamRosterRequestValidator` rule emits "Manager not found or user is not a manager" for non-positive `ManagerId`, matching the today-the-handler behavior for that input class; positive `ManagerId` falls through to the existing handler DB lookup, which keeps emitting the same message for missing/non-Manager rows.

## Deviations from refactor-plan.md "Planned commits"

None. Slice executed exactly as planner commit (b). The `RF-001` validation-test-assertions drift is acknowledged as a known harness tension (orchestrator note); validator-driven tests were rerouted through `ValidationPipeline.ValidateAsync` so that the wire-level (StatusCode, Detail) tuples remain assertable. `RF-003` (single-source translator) and `RF-004` (internal composer) carry into the iter-3 + iter-4 cleanup slices per planner's commit (e); not addressed here to keep the Users slice atomic.

## Out of scope this iter

- `OneMoreTaskTracker.Features` validators + `FeatureValidation.cs` deletion (commit d — iter 3).
- DRY consolidation of the test `ValidationPipeline` and the production interceptor (RF-003 — iter 4).
- Visibility tightening of `ValidationDetailComposer` to `internal` (RF-004 — iter 4).
- Multi-failure integration smoke tests (commit e — iter 4).
