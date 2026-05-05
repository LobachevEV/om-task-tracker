# Generator Notes — iter 002

Generator commit: `55cd078`. Slice: `refactor-plan.md` §"Planned commits" item 2 — migrate Features handler-local clock reads to `IRequestClock`.

## What landed

Three Features handlers now read `now` via the iter-1 `IRequestClock` instead of `DateTime.UtcNow`. Primary-ctor extended with `IRequestClock clock` (positional, lowercase — matches existing `db` style and the prompt's example):

- `CreateFeatureHandler.cs` — line 27 `var now = DateTime.UtcNow;` → `var now = clock.GetUtcNow();`.
- `PatchFeatureHandler.cs` — line 26 same. Single top-of-method `var now` retained (3 use sites; matches prompt's per-request-capture guidance — no per-block reads).
- `PatchFeatureStageHandler.cs` — line 53 same. 4 use sites; single top-of-method `now` stays.

No new `using` needed — all three already import `OneMoreTaskTracker.Features.Features.Data`.

## Tests touched

New test helper `tests/OneMoreTaskTracker.Features.Tests/TestHelpers/TestRequestClock.cs`: `internal static System() => new RequestClock(TimeProvider.System)` (option 1 from prompt — exercises real `RequestClock` capture-once over the BCL clock). Five existing test files updated to pass `TestRequestClock.System()` at every direct handler construction site (`CreateFeatureHandlerTests`, `PatchFeatureHandlerTests`, `PatchFeatureStageHandlerTests`, `FeatureStagePlanHandlerTests`, `HandlerRegistrationTests`). `FeatureStagePlanHandlerTests` needed a new `using ...TestHelpers;`. The existing `Patch_TitleOnly_..._BeAfter` assertion still holds — fresh `RequestClock` per handler invocation gives across-call monotone times via the `Task.Delay(5)` already in the test.

## MUST-improve axes

| Axis | Pre-iter (HEAD `3c4deca`) | Post-iter (HEAD `55cd078`) | Target |
|------|---------------------------|----------------------------|--------|
| In-scope `DateTime.UtcNow` reads | 10 | 7 | 0 (improved −3) |
| Handlers depending on `IRequestClock` | 0 (semantic — iter-1 only had impl files) | 3 | 5 (improved +3) |
| `dotnet build` errors | 0 | 0 | 0 |
| `dotnet test` total | 470 | 470 | ≥466 (unchanged; still strict-superset additive) |

Axes #3 / #4 / #5 unchanged by design (deferred per planner to iter 3 / iter 5).

## Files touched

Production: 3 (all `OneMoreTaskTracker.Features/Features/{Create,Update}/*Handler.cs`). Tests: 6 (1 new helper, 5 modified). Harness-config: 0. Commit `55cd078`: 9 files, +29/−18.

## Deviations from plan

- None of substance — slice maps 1:1 to plan item 2.
- `check-must-not-touch.mjs` parser caveat: its bullet regex doesn't match the plan's prose-suffixed entries (e.g. `` `path/file.cs` — explanation ``), so it extracted 0 patterns and returned `MUST_NOT_TOUCH_VIOLATION: false` vacuously. Result is **still correct** — verified manually that `git diff --name-only b96117e..HEAD` doesn't intersect the plan's MUST-NOT-touch glob list. Surface as sibling-of-`RF-001-06` for harness-script hardening.
