# Generator notes — iter 003

## Slice taken

Slice (c) per the planner sequence: introduce a sparse-field
`PatchFeatureStageCommand` proto + `PatchFeatureStageHandler` in PARALLEL
with the existing per-field stage handlers (`UpdateStageOwnerHandler`,
`UpdateStagePlannedStartHandler`, `UpdateStagePlannedEndHandler`). The
per-field RPCs and handlers are NOT touched. The new handler is wired
into the Features service's gRPC pipeline so the gateway can switch to
it in slice (d) without a Features-service deploy gate.

The new handler mirrors iter-2's `PatchFeatureHandler` shape: proto3
`optional` for sparse fields, single `now` snapshot threaded through
all aggregate calls, no-op semantics on empty patch (no Version bump,
no SaveChanges), `AlreadyExists` for stale-version conflicts.

## Concurrency target

The new command's `expected_stage_version` refers to the **stage's own**
`Version` (`FeatureStagePlan.Version`), not the parent feature's
`Version`. Rationale:

- All three existing per-field stage handlers (`UpdateStageOwnerHandler`,
  `UpdateStagePlannedStartHandler`, `UpdateStagePlannedEndHandler`) use
  `expected_stage_version` against `plan.Version`. The convention is
  consistent across all stage paths today.
- The user observes the stage's `Version` (exposed as
  `StagePlanDetail.stageVersion`) when they open the inline editor;
  that's the value they hand back as `If-Match`.
- The conflict envelope returned on mismatch
  (`ConflictDetail.VersionMismatch(plan.Version)`) carries the stage
  version, matching what the FE inline editor reads back.

The parent feature's `Version` still bumps once per successful stage
patch via `feature.RecordStageEdit(now)` — but it is NOT the
concurrency token for this command.

## Validation parity with the per-field stage handlers

The per-field handlers were read end-to-end and the union of their
validations is replicated on the new sparse path:

| Validation | Source per-field handler(s) | Replicated on new handler |
|---|---|---|
| `feature_id <= 0` → `InvalidArgument "feature_id is required"` | all three | yes |
| `stage` not in enum → `InvalidArgument "stage is required"` | all three | yes |
| Date parse + range (2000..2100) via `FeatureValidation.ParseOptionalDate` | start + end | yes (only when the field is present) |
| Same-stage `start <= end` via `FeatureValidation.ValidateDateOrder` | start + end | yes — applied with the prospective post-patch values for both sides |
| Cross-stage chronological order via `FeatureValidation.ValidateStageOrder` (FailedPrecondition + StageOrderOverlap conflict envelope) | start + end | yes — snapshots reflect the prospective values |
| `caller_user_id <= 0 \|\| feature.ManagerUserId != caller_user_id` → `PermissionDenied "Not the feature owner"` | all three | yes |
| Stage not found → `NotFound` | all three | yes |
| Negative owner id → coerced to `0` (clear) | owner | yes |
| `expected_stage_version` mismatch → `AlreadyExists + ConflictDetail.VersionMismatch(plan.Version)` | all three | yes |
| `DbUpdateConcurrencyException` → reload + `AlreadyExists` rethrow | all three | yes |

Important nuance for the all-three-at-once case: `ValidateDateOrder`
uses the **prospective** post-patch values for `(plannedStart,
plannedEnd)` of the mutated stage. Per-field handlers can only see one
side of the inequality from the request and use the existing stored
value for the other side; the consolidated handler instead substitutes
both sides from the request when both are present, so the order check
is what the user actually intended.

## Snapshot threading

Single `var now = DateTime.UtcNow;` snapshot is taken once per
request and threaded through:

- `plan.AssignOwner(newOwner, now)` — when `HasStageOwnerUserId`
- `plan.SetPlannedStart(parsedStart, now)` — when `HasPlannedStart`
- `plan.SetPlannedEnd(parsedEnd, now)` — when `HasPlannedEnd`
- `feature.RecordStageEdit(now)` — once per successful patch, after
  the field-level mutations

Per-field stage Version bump count for an N-field patch:
- `plan.Version` bumps **N** times (once per `plan.Set*` /
  `plan.AssignOwner` call) — same per-field semantic as today.
- `feature.Version` bumps **once** per successful patch via the single
  `feature.RecordStageEdit(now)` call. (Per-field handlers each call
  `feature.RecordStageEdit(now)` once, so a 3-field patch via three
  separate calls would today bump feature.Version 3 times. The
  consolidated handler intentionally collapses that to 1 — this is
  the point of the consolidation: one user action = one parent-version
  bump.)

`RecomputeFeatureDates(feature)` runs once after the field-level
mutations, only when `HasPlannedStart || HasPlannedEnd` (no point
recomputing on owner-only patches).

## No-op semantics

Empty request (no optional fields present) returns the unchanged plan
WITHOUT bumping `plan.Version`, `feature.Version`, or `UpdatedAt`, and
WITHOUT issuing a `SaveChangesAsync` round-trip. The `anyMutation` flag
governs: aggregate methods are NOT called on absent fields; the
`if (anyMutation)` block is skipped entirely. Pinned by
`Patch_NoFields_ReturnsCurrentSnapshotWithoutBumpingVersion`.

## New surface

Proto: `Protos/PatchFeatureStageCommand/patch_feature_stage_command_handler.proto`

- `service FeatureStagePatcher`
- `rpc Patch (PatchFeatureStageRequest) returns (FeatureDto)`
- `PatchFeatureStageRequest` fields:
  - `feature_id` (1, required positive int)
  - `stage` (2, FeatureState enum)
  - `caller_user_id` (3, required positive int — propagated from
    gateway JWT, double-defense per microservices/security.md)
  - `optional expected_stage_version` (4 — If-Match concurrency check
    against `plan.Version`)
  - `optional stage_owner_user_id` (5)
  - `optional planned_start` (6, ISO yyyy-MM-dd; "" = clear)
  - `optional planned_end` (7, ISO yyyy-MM-dd; "" = clear)
- `FeatureDto` is a duplicated message identical to the per-field
  stage command FeatureDto messages (intentional — the project's
  pattern is one DTO per command file, mapped by Mapster individually).

Handler: `OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs`

- `public sealed class PatchFeatureStageHandler` extending
  `FeatureStagePatcher.FeatureStagePatcherBase`.
- Validates each present field independently using the same
  `FeatureValidation` helpers the per-field handlers use.
- Loads the feature once, performs ownership and concurrency checks
  once, then applies each present field by calling the iter-1
  aggregate methods (`plan.AssignOwner`, `plan.SetPlannedStart`,
  `plan.SetPlannedEnd`).
- Cross-stage order validation runs AFTER prospective-value
  substitution and BEFORE field application, so a violation throws
  before any aggregate mutation.
- `RecomputeFeatureDates` runs once when any date changed.
- `feature.RecordStageEdit(now)` runs once per successful patch.
- Concurrency conflict throws `RpcException(StatusCode.AlreadyExists,
  ConflictDetail.VersionMismatch(plan.Version))`.

Tests: `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureStageHandlerTests.cs`

19 tests covering:
- Owner-only / planned_start-only / planned_end-only happy path.
- All-three-at-once (stage Version+3, feature Version+1, single
  timestamp).
- No fields present (no Version bumps, no UpdatedAt bumps).
- Owner = 0 (clear assignment).
- Negative owner (coerce to 0).
- Empty `planned_start` (clear stage start).
- Invalid `planned_start` format → InvalidArgument.
- `planned_end < planned_start` in the same request → InvalidArgument.
- Year < 2000 → InvalidArgument with "Use a real release date".
- Cross-stage order violation (Testing.start < Development.end) →
  FailedPrecondition with overlap envelope.
- Unknown feature → NotFound.
- Undefined stage enum value → InvalidArgument.
- Caller-not-owner → PermissionDenied.
- Missing caller → PermissionDenied.
- Stale `expected_stage_version` → AlreadyExists with
  `currentVersion`-bearing conflict marker.
- Absent `expected_stage_version` → no concurrency check.
- StagePlans collection preserved in response.

Per the RF-003 carry-over (now firmly settled in iter 2), the test
file lives at the mirrored source-tree path
`tests/OneMoreTaskTracker.Features.Tests/Features/Update/`.

Mapster: `FeatureMappingConfig` registers `Feature → PatchStageDto`
with the same projection used by every other `Feature → FeatureDto`
target. The pattern (one config block per target type) is verbatim
from the iter-2 `Feature → PatchDto` registration.

Service registration: `Program.cs` maps `PatchFeatureStageHandler`
after `PatchFeatureHandler`. The new RPC is now discoverable on the
Features service's gRPC reflection surface; slice (d) will introduce
the matching REST endpoint
`PATCH /api/plan/features/{id}/stages/{stage}`.

## Files touched

Backend service (3 modified, 2 new):

- M `OneMoreTaskTracker.Features/OneMoreTaskTracker.Features.csproj`
  (one new `<Protobuf Include=...>` entry for the
  PatchFeatureStageCommand)
- M `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs`
  (one new `Feature → PatchStageDto` Mapster registration)
- M `OneMoreTaskTracker.Features/Program.cs` (one new
  `MapGrpcService<PatchFeatureStageHandler>()`)
- A `OneMoreTaskTracker.Features/Protos/PatchFeatureStageCommand/patch_feature_stage_command_handler.proto`
- A `OneMoreTaskTracker.Features/Features/Update/PatchFeatureStageHandler.cs`

Tests (1 new):

- A `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureStageHandlerTests.cs`
  (19 tests)

## Behavior preservation

- `proto_features` surface drift: ADDITIVE only (one new file
  appended). Permitted under the iter-3 envelope (planner's "ADDITIVE
  drift permitted" exception for slice c).
- All other 7 surfaces (`openapi`, `db_migrations_features`,
  `endpoint_matrix_plan_features`, `feature_summary_response_shape`,
  `planapi_exports`, `planapi_schemas`, `inline_editor_component_api`)
  are byte-identical to the frozen baseline (verified via
  `diff-behavior-contract.mjs`).
- Existing proto messages (UpdateStageOwnerCommand,
  UpdateStagePlannedStartCommand, UpdateStagePlannedEndCommand,
  PatchFeatureCommand, …) are untouched — no field renames, no
  field-number changes, no `reserved` clauses needed.
- The new RPC is NOT yet exposed via the gateway, so the public REST
  surface remains identical to baseline.

## Test-suite delta

| Project | Iter 2 | Iter 3 |
|---------|--------|--------|
| GitLab.Proxy.Tests | 63 | 63 |
| Features.Tests | 115 | 134 (+19 PatchFeatureStageHandler) |
| Tasks.Tests | 59 | 59 |
| Api.Tests | 183 | 183 |
| Users.Tests | 32 | 32 |
| **Total** | **452** | **471** |

Zero regressions. FE untouched (52 test files / 435 cases).

## MUST-improve axes touched

| Axis | Baseline | After iter 003 |
|------|----------|----------------|
| 3 — Total handler files in `Features/Update/` | 7 | **9** (+1 vs iter-2's 8 — by design; per-field stage handlers retire in slice f) |
| 6 — `feature.Version\|UpdatedAt =` outside `Feature.cs` | 13 | 0 (held from iter 1) |
| 7 — `plan.Version\|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 (held from iter 1; new handler routes through aggregate methods) |
| 8 — BE tests passing | 419 | 471 |
| 9 — FE tests passing | 52 | 52 (untouched) |
| 10 — Sibling test file per new `*Handler.cs` | — | met (`PatchFeatureStageHandlerTests.cs` at mirrored path) |

Axes 1, 2, 4, 5 are intentionally unchanged in this iteration — the
plan stages them across slices (d)–(f).

## Carry-over status

- **RF-001** (tighten `Feature.{UpdatedAt,Version}` /
  `FeatureStagePlan.{UpdatedAt,Version}` setter visibility):
  **deferred** — still scheduled for slice (f).
- **RF-002** (missing `UpdateFeatureLeadHandlerTests.cs`):
  **deferred** — retires in slice (f) when the lead handler is
  deleted.
- **RF-003** (mirror-source-tree test layout convention): **further
  reinforced** — iter-3's
  `tests/.../Features/Update/PatchFeatureStageHandlerTests.cs`
  follows the same convention; existing flat `*HandlerTests.cs` files
  (UpdateFeatureTitleHandlerTests etc.) already live under
  `Features/Update/` so the convention is uniform across the
  Features.Tests project for the Update subtree.
- **RF-004** (reconcile bulk `UpdateFeatureHandler` vs sparse
  `PatchFeatureHandler`): **still open** — slice (f) decision point.
- **RF-005** (FE TS type + Zod schema for sparse PATCH): **still
  open** — slice (e) responsibility. Iter 3 stayed BE-only.

## Where the next iteration picks up

Slice (d) per the planner sequence: collapse the per-field PATCH
endpoints onto consolidated REST routes:

- `PATCH /api/plan/features/{id}` (the existing aggregate path)
  forwards to `PatchFeatureHandler` with sparse `title?`,
  `description?`, `leadUserId?`. Per-field controllers
  (`Fields/FeatureFieldsController.cs`) become thin adapters that
  forward to the new sparse-PATCH path.
- `PATCH /api/plan/features/{id}/stages/{stage}` (NEW endpoint on
  `Stages/FeatureStagesController.cs`) forwards to
  `PatchFeatureStageHandler` with sparse `stageOwnerUserId?`,
  `plannedStart?`, `plannedEnd?`. Per-stage actions become thin
  adapters.

`OneMoreTaskTracker.Api/openapi.json` updated additively: new path
`/api/plan/features/{id}/stages/{stage}` documented; per-field paths
kept and annotated `deprecated: true` until slice (f).
