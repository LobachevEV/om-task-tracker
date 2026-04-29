# Generator notes — iter 3

## Slice taken

Migrate `OneMoreTaskTracker.Features` to FluentValidation, mirroring the per-service
pattern from iters 1-2 (Tasks/Users). Plus RF-007 follow-up: drop the conflating
`GetTeamRosterRequestValidator` from `OneMoreTaskTracker.Users`.

## MUST-improve axes touched

- Axis 1 (FluentValidation present in 3 in-scope services): 2 → 3.
- Axis 2 (`FeatureValidation.cs` static helpers): 1 → 0 (deleted).
- Axis 3 (`AbstractValidator<TRequest>` classes): 9 → 14 (added Create/Patch/PatchStage/Get/List for Features).
- Axis 4 (one-type-per-file validators): all 5 new validators in their own files alongside their handler.
- Axis 6 (inline `RpcException(InvalidArgument, ...)` guards in Features handlers): 11 → 0.
- Axis 8 (RF-007 — `GetTeamRoster` state-driven message conflation): rule dropped, sibling test deleted.

## Files touched (27)

- 5 new validators co-located with handlers (`Features/{Create,Update,Get,List}/*RequestValidator.cs`).
- 2 new `Features/Validation/` infra files (`ValidationExceptionInterceptor.cs`, `ValidationDetailComposer.cs`).
- 6 handler edits (Create, Patch, PatchStage, Get, List, plus `Program.cs` for DI).
- 1 deletion (`Features/Data/FeatureValidation.cs`).
- 1 csproj edit (FluentValidation 11.10.0 + DI extension).
- 5 new sibling validator test files + 1 `TestHelpers/ValidationPipeline.cs`.
- 6 existing handler tests rerouted through `ValidationPipeline` for validator-driven assertions.
- 2 deletions in Users tests + Users src (RF-007).

## Cross-aggregate stage-order check

`ValidateStageOrder` moved out of `FeatureValidation.cs` into `PatchFeatureStageHandler`
as a private `EnsureStageOrder` method — still throws `RpcException(FailedPrecondition,
ConflictDetail.StageOrderOverlap(...))` byte-identically. Only request-shape rules went
into the validator, per plan §"Out of scope".

## Deviation from planned commits

None. Plan §"Planned commits" item 3 = "Migrate Features validators; delete
`FeatureValidation` static helper." Executed verbatim. RF-007 absorbed into this commit
because the planner amendment (2026-04-29) marked it as a one-line follow-up safe to
bundle with the Features slice.

## Quality bar

- `dotnet build OneMoreTaskTracker.slnx`: 0 warning, 0 error.
- `dotnet test OneMoreTaskTracker.slnx --no-build`: 466 / 466 passing
  (Features 116, Tasks 68, Users 45, Api 174, GitLab.Proxy 63).
- `check-must-not-touch.mjs --baseline-sha e21a3e40 --current-sha HEAD`:
  `MUST_NOT_TOUCH_VIOLATION:false`.
