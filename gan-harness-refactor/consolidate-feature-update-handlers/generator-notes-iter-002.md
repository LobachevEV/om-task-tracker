# Generator notes — iter 002

## Slice taken

Iter 2 from the dispatch prompt: introduce a sparse-field
`PatchFeatureCommand` proto + `PatchFeatureHandler` in PARALLEL with
the existing per-field handlers. The per-field RPCs and handlers are
NOT touched in this iteration. The new handler is wired into the
Features service's gRPC pipeline so the gateway can switch to it in
slice (d) without a Features-service deploy gate.

## Sparse-shape design choice

Picked **proto3 `optional` fields** over `google.protobuf.FieldMask`.

Rationale: `optional` is idiomatic in Grpc.AspNetCore and the rest of
the repo already uses the `Has<Field>` accessor pattern for this exact
purpose (see `UpdateFeatureTitleRequest.HasExpectedVersion` in
`Protos/UpdateFeatureTitleCommand/...`). FieldMask would import a
well-known type and force every caller to construct a `FieldMask`
proto for what is effectively the same `is-this-field-set` question.
Optional fields generate a `Has<Name>` accessor on the C# message,
matching the pattern handlers already use.

## New surface

Proto: `Protos/PatchFeatureCommand/patch_feature_command_handler.proto`

- service `FeaturePatcher`
- rpc `Patch (PatchFeatureRequest) returns (FeatureDto)`
- `PatchFeatureRequest` fields:
  - `id` (1, required positive int)
  - `caller_user_id` (2, required positive int — propagated from
    gateway JWT, double-defense per microservices/security.md)
  - `optional expected_version` (3 — If-Match concurrency check)
  - `optional title` (4)
  - `optional description` (5)
  - `optional lead_user_id` (6)
- `FeatureDto` is a duplicated message identical to the per-field
  command FeatureDto messages (intentional — the project's pattern is
  one DTO per command file, mapped by Mapster individually).

Handler: `OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs`

- `public sealed class PatchFeatureHandler` extending
  `FeaturePatcher.FeaturePatcherBase`.
- Validates each present field independently (same constraints as the
  per-field handlers — title trim/length, description length,
  lead_user_id positive).
- Loads the feature once, performs the ownership and concurrency
  checks once, then applies each present field by calling the iter-1
  aggregate methods (`feature.RenameTitle`, `feature.SetDescription`,
  `feature.AssignLead`).
- Each present field bumps `Version` by exactly one (so a 3-field
  patch bumps `Version` by 3 — see test
  `Patch_AllThreeFieldsAtOnce_BumpsVersionByThreeWithSingleUpdatedAtSnapshot`).
- A no-op patch (no fields present) returns the unchanged feature
  WITHOUT bumping `Version` or `UpdatedAt` and WITHOUT issuing a
  `SaveChangesAsync` round-trip — this matches REST PATCH semantics
  ("send the changes you want, no fields = no change").
- Concurrency conflict throws `RpcException(StatusCode.AlreadyExists,
  ConflictDetail.VersionMismatch(feature.Version))` matching the
  per-field handler convention. The gateway middleware
  (`GrpcExceptionMiddleware`) already maps `AlreadyExists → HTTP 409`
  with the conflict envelope.
- Single `var now = DateTime.UtcNow;` snapshot is threaded through all
  aggregate calls so `UpdatedAt` is monotonic across the multi-field
  case.

Tests: `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureHandlerTests.cs`

17 tests covering:
- Title-only / description-only / lead-only happy path (Version+1).
- All three at once (Version+3, single timestamp).
- No fields (no Version bump, no UpdatedAt bump).
- Title trim + empty/too-long validation.
- Description too-long validation.
- Description blank → null aggregate semantics preserved.
- LeadUserId zero → InvalidArgument.
- Unknown id → NotFound.
- Caller-not-owner / missing caller → PermissionDenied.
- Stale `expected_version` → AlreadyExists with conflict marker.
- Absent `expected_version` → no concurrency check.
- StagePlans collection preserved in response shape.

Per the RF-003 carry-over, the test file lives at the mirrored
source-tree path `tests/OneMoreTaskTracker.Features.Tests/Features/Update/`,
matching the convention the iter-1 verdict flagged for consolidation.

Mapster: `FeatureMappingConfig` registers `Feature → PatchDto` with
the same projection used by every other Feature→FeatureDto target.
The pattern (one config block per target type) is verbatim.

Service registration: `Program.cs` maps `PatchFeatureHandler` after
the existing six per-field/bulk handlers. The new RPC is now
discoverable on the Features service's gRPC reflection surface; the
gateway slice (d) will introduce the matching REST endpoint.

## Files touched

Backend service (3 modified, 2 new):

- M `OneMoreTaskTracker.Features/OneMoreTaskTracker.Features.csproj`
  (one new `<Protobuf Include=...>` entry for the PatchFeatureCommand)
- M `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs`
  (one new `Feature → PatchDto` Mapster registration)
- M `OneMoreTaskTracker.Features/Program.cs` (one new
  `MapGrpcService<PatchFeatureHandler>()`)
- A `OneMoreTaskTracker.Features/Protos/PatchFeatureCommand/patch_feature_command_handler.proto`
- A `OneMoreTaskTracker.Features/Features/Update/PatchFeatureHandler.cs`

Tests (1 new):

- A `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureHandlerTests.cs`
  (17 tests)

## Behavior preservation

- `proto_features` surface drift: ADDITIVE only (one new file
  appended). Permitted under the iter-2 envelope (planner's
  "ADDITIVE drift permitted" exception for slice b).
- All other 7 surfaces (`openapi`, `db_migrations_features`,
  `endpoint_matrix_plan_features`, `feature_summary_response_shape`,
  `planapi_exports`, `planapi_schemas`, `inline_editor_component_api`)
  are byte-identical to the frozen baseline (verified via
  `diff-behavior-contract.mjs`).
- Existing proto messages (UpdateFeatureCommand, UpdateFeatureTitleCommand,
  …) are untouched — no field renames, no field-number changes, no
  `reserved` clauses needed in this iteration.
- The new RPC is NOT yet exposed via the gateway, so the public REST
  surface remains identical to baseline.

## Test-suite delta

| Project | Iter 1 | Iter 2 |
|---------|--------|--------|
| GitLab.Proxy.Tests | 63 | 63 |
| Features.Tests | 98 | 115 (+17 PatchFeatureHandler) |
| Tasks.Tests | 59 | 59 |
| Api.Tests | 183 | 183 |
| Users.Tests | 32 | 32 |
| **Total** | **435** | **452** |

Zero regressions. FE untouched (52 test files).

## MUST-improve axes touched

| Axis | Baseline | After iter 002 |
|------|----------|----------------|
| 6 — `feature.Version|UpdatedAt =` outside `Feature.cs` | 13 | 0 (held from iter 1) |
| 7 — `plan.Version|UpdatedAt =` outside `FeatureStagePlan.cs` | 6 | 0 (held from iter 1) |
| 8 — BE tests passing | 419 | 452 |
| 9 — FE tests passing | 52 | 52 (untouched) |

Axes 1–5 + 10 are intentionally unchanged in this iteration — the
plan stages them across commits (c)–(f).

## Carry-overs declined

- **RF-001** (tighten `Feature.{UpdatedAt,Version}` and
  `FeatureStagePlan.{UpdatedAt,Version}` setter visibility to
  `private set`): per dispatch instructions, deferred to the iter
  that ships commit (f). Untouched here.
- **RF-002** (missing `UpdateFeatureLeadHandlerTests.cs`): no action
  required — the lead handler is scheduled for deletion in commit
  (f), so the gap retires at that point.

## Where the next iteration picks up

Slice (c) per the planner sequence: introduce
`UpdateFeatureStageCommand` proto + `UpdateFeatureStageHandler` for
the stage-scoped patch (sparse `stage_owner_user_id?`,
`planned_start?`, `planned_end?`, `expected_stage_version?`). The new
stage handler should follow the same shape as `PatchFeatureHandler`
landed here:

- Proto3 `optional` for every field other than `id`, `stage`, and
  `caller_user_id`.
- Single `now` snapshot threaded through both `plan.Set*`/`plan.AssignOwner`
  and `feature.RecordStageEdit` (so the parent feature's version
  bumps once even when multiple stage fields change in one call).
- Sibling test file at
  `tests/OneMoreTaskTracker.Features.Tests/Features/Update/UpdateFeatureStageHandlerTests.cs`
  with the same sparse-permutation matrix (each-field-isolated,
  all-fields-at-once, no-op, version-mismatch, missing-stage).

Slice (d) will then collapse the per-field PATCH endpoints onto
`PATCH /api/plan/features/{id}` (forwarded to PatchFeatureHandler)
and `PATCH /api/plan/features/{id}/stages/{stage}` (forwarded to the
new stage handler from slice c).
