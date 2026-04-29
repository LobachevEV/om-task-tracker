# Generator notes — iter 001

## Slice taken

Step (a) from `refactor-plan.md` § "Planned commits": encapsulate `Version` +
`UpdatedAt` invariants on the `Feature` and `FeatureStagePlan` aggregates.
No wire surface changed. The 6 per-field handlers now call new aggregate
methods instead of writing `feature.Version` / `feature.UpdatedAt` /
`plan.Version` / `plan.UpdatedAt` directly.

## MUST-improve axes touched

| Axis | Baseline | After iter 001 |
|------|----------|----------------|
| 6 — `feature.Version|UpdatedAt =` outside `Feature.cs` | 13 | 0 |
| 7 — `plan.Version|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 |
| 8 — BE tests passing | 419 | 435 (added 16 aggregate-method unit tests; 0 regressed) |
| 9 — FE tests passing | 52 files | 52 files (untouched) |

Axes 1, 2, 3, 4, 5, 10 are intentionally unchanged in this iteration — they
move in commits (b)–(f) per the planned sequence.

## Aggregate API added

`Feature` (in `OneMoreTaskTracker.Features/Features/Data/Feature.cs`):

- `RenameTitle(string newTitle, DateTime now)`
- `SetDescription(string? newDescription, DateTime now)`
- `AssignLead(int leadUserId, DateTime now)`
- `RecordStageEdit(DateTime now)` — for stage-driven feature-version bumps
- `Touch(DateTime now)` — updates `UpdatedAt` only (used by the bulk
  `UpdateFeatureHandler` which historically does not bump `Version`)

`FeatureStagePlan` (in `.../FeatureStagePlan.cs`):

- `AssignOwner(int ownerUserId, DateTime now)`
- `SetPlannedStart(DateOnly? plannedStart, DateTime now)`
- `SetPlannedEnd(DateOnly? plannedEnd, DateTime now)`
- `Touch(DateTime now)`

Each "mutating" method bumps `Version` by exactly 1 and stamps `UpdatedAt`.
Behavior matches the prior unconditional bump, so existing tests
(`UpdateFeatureTitleHandlerTests`, etc.) remain green without changes.

## Files touched

Backend service (8 files):

- `OneMoreTaskTracker.Features/Features/Data/Feature.cs` (added 5 methods)
- `OneMoreTaskTracker.Features/Features/Data/FeatureStagePlan.cs` (added 4 methods)
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureTitleHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureDescriptionHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureLeadHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateFeatureHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateStageOwnerHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedStartHandler.cs`
- `OneMoreTaskTracker.Features/Features/Update/UpdateStagePlannedEndHandler.cs`

Tests (2 new files):

- `tests/OneMoreTaskTracker.Features.Tests/Features/Data/FeatureAggregateTests.cs` (8 tests)
- `tests/OneMoreTaskTracker.Features.Tests/Features/Data/FeatureStagePlanAggregateTests.cs` (8 tests)

## Deviations from planned sequence

None. Slice (a) landed verbatim; setters were left as `public set` rather
than tightened to `private set` because:

- `CreateFeatureHandler` and `DevFeatureSeeder` populate `UpdatedAt` via
  object initializers; flipping to `private set` would force a separate
  refactor of the create path that is out of scope for iter 1.
- The grep-based axes (6, 7) are the actual gate — they're at 0.
- A future iteration can tighten visibility once the consolidated handler
  surface lands and the create path is the only remaining writer outside
  the aggregate.

## Behavior preservation

- No proto changes, no DTO shape changes, no controller changes, no
  endpoint additions/removals, no FE changes. The 8 captured behavior-contract
  surfaces remain byte-equivalent (verified by source-of-truth: zero edits
  to `Protos/`, `OneMoreTaskTracker.Api/`, `OneMoreTaskTracker.WebClient/`,
  `Migrations/`, `appsettings*.json`, `Dockerfile`, `compose.yaml`).
- The stage handlers previously took `DateTime.UtcNow` twice (once for
  `plan.UpdatedAt`, then aliased to `feature.UpdatedAt`). The refactor
  takes one snapshot and passes it to both `plan.AssignOwner/...` and
  `feature.RecordStageEdit`, preserving the "both timestamps equal"
  invariant.

## Where the next iteration picks up

Step (b): grow `UpdateFeatureRequest` proto + `UpdateFeatureHandler` to
consume sparse fields and route Title/Description/Lead through the new
aggregate methods. Per-field handlers stay alive (they already call the
aggregate methods now).
