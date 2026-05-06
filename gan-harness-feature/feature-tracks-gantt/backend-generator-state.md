# Backend Generator State — feature-tracks-gantt

## Iteration

**Current**: 5
**Digest Version Consumed**: 1 (no bump)

---

## Status

**Phase**: B — Feedback Addressed (complete)
**Contract**: Frozen v1 (unchanged)
**CONTRACT_BUMP**: false

---

## What Was Done This Iteration

### Issues Addressed

| Issue ID | Description | Resolution |
|----------|-------------|------------|
| BE-004-01 / CT-004-01 | `PATCH .../tracks/{kind}/stages/{stageKey}` and `PATCH .../tracks/{kind}` silently ignored JSON `null` for `stageOwnerUserId` / `trackOwnerUserId` — should clear the owner (proto sentinel `-1`) | Changed payload fields from `int?` to `JsonElement?`; added `DecodeOwnerField()` tri-state helper in `PlanRequestHelpers` (absent → no-op, null → proto -1, `>0` → assign, `0` → 400); both PATCH controllers updated |
| BE-004-02 | 4 Api.Tests failed because `MockUserService.GetTeamRosterAsync` was not stubbed in the test factory — NSubstitute returned a default `GetTeamRosterResponse` with null `Members`, causing NRE in `PlanRequestHelpers.LoadRosterForManagerAsync` | Added a default `GetTeamRosterAsync` stub in `TasksControllerWebApplicationFactory` constructor returning empty `GetTeamRosterResponse`; also added defensive `(roster.Members ?? [])` null-coalesce in `LoadRosterForManagerAsync` |
| BE-004-03 | `trackOwner` was null on LIST endpoint (`GET /api/plan/features`) even though `trackOwnerUserId` was set; `FeatureTrackSummaryResponse.From()` did not resolve the owner from the roster | Added `MiniTeamMemberResponse? TrackOwner` field to `FeatureTrackSummaryResponse`; updated `From()` to resolve via `roster.TryGetValue(track.TrackOwnerUserId)` mirroring the DETAIL path in `FromDetail()` |
| BE-004-04 | `migrate-features` was not auto-run on `docker compose up` | Already present in `compose.yaml` (`depends_on: migrate-features: condition: service_completed_successfully`) — no change needed |

### Pre-existing build errors fixed (Boy Scout rule)

| File | Fix |
|------|-----|
| `tests/OneMoreTaskTracker.Api.Tests/Controllers/AuthControllerIntegrationTests.cs:296` | Added `_ =` discard to suppress CS4014 on unawaited `Received(1).AuthenticateAsync(...)` |
| `tests/OneMoreTaskTracker.Api.Tests/Controllers/TeamControllerIntegrationTests.cs:446` | Added `_ =` discard to suppress CS4014 on unawaited `Received(1).DeleteUserAsync(...)` |

### New Files

None.

### Modified Files

| File | Change |
|------|--------|
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/PatchFeatureTrackPayload.cs` | `TrackOwnerUserId` changed from `int?` to `JsonElement?` |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/PatchFeatureTrackStagePayload.cs` | `StageOwnerUserId` changed from `int?` to `JsonElement?` |
| `OneMoreTaskTracker.Api/Controllers/Plan/PlanRequestHelpers.cs` | Added `DecodeOwnerField(JsonElement?)` helper; defensive `(roster.Members ?? [])` in `LoadRosterForManagerAsync` |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/PatchFeatureTrackController.cs` | Uses `DecodeOwnerField`; rejects value `0` with 400; sets proto field only when `ownerHasValue` |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/PatchFeatureTrackStageController.cs` | Uses `DecodeOwnerField`; rejects value `0` with 400; sets proto field only when `ownerHasValue` |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/FeatureTrackSummaryResponse.cs` | Added `MiniTeamMemberResponse? TrackOwner` field; `From()` resolves it from roster |
| `tests/OneMoreTaskTracker.Api.Tests/Infra/TasksControllerWebApplicationFactory.cs` | Constructor stubs `MockUserService.GetTeamRosterAsync` returning empty response |
| `tests/OneMoreTaskTracker.Api.Tests/Controllers/AuthControllerIntegrationTests.cs` | CS4014 discard fix |
| `tests/OneMoreTaskTracker.Api.Tests/Controllers/TeamControllerIntegrationTests.cs` | CS4014 discard fix |

---

## Test Results

All 562 tests pass (0 failures, 0 skipped).

| Project | Passed |
|---------|--------|
| Api.Tests | 228 |
| Features.Tests | 158 |
| Tasks.Tests | 68 |
| Users.Tests | 45 |
| GitLab.Proxy.Tests | 63 |

---

## Contract Artifact

**Path**: `OneMoreTaskTracker.Api/openapi.json`
**Version**: v1 (frozen; no changes this iteration)
**Regenerated**: no — endpoint shapes unchanged (field `TrackOwner` was already in `FeatureTrackSummaryResponse` per contract; was being emitted as null before; now resolved correctly)

---

## Open Issues

None.

---

## Disputed Feedback

None.

---

## Next Actions

```json
[]
```
