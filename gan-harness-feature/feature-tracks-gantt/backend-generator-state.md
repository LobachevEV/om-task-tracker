# Backend Generator State — feature-tracks-gantt

## Iteration

**Current**: 3
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
| BE-002-01 / CT-002-01 (AUTO-FAIL) | Server-side stage-key kind-validation absent; seeder emitted 6 shared keys per track; orphan rows in existing DBs | Created `FeatureTrackStageScope` single source of truth; added admission rule to `PatchFeatureTrackStageRequestValidator`; fixed `DevFeatureSeeder.SeedTracksAsync` to use per-kind key set; added data-fix migration `20260506150000_DeleteCrossKindTrackStages` |
| BE-002-03 / CT-002-02 | `GET /api/plan/features/{id}` response missing `tracks` | Created `FeatureTrackDetailResponse` with `TrackOwner: MiniTeamMember?` and per-stage `StageOwner: MiniTeamMember?`; extended `FeatureDetailResponse` with `Tracks`; updated `FeaturesController.Get` to project tracks via `FeatureTrackSummaryResponse.FromDetail` with roster resolution; stale ids resolve to null |

### New Files

| File | Purpose |
|------|---------|
| `OneMoreTaskTracker.Features/Features/Data/FeatureTrackStageScope.cs` | Per-kind admitted stage key sets (single source of truth for seeder, validator) |
| `OneMoreTaskTracker.Features/Migrations/20260506150000_DeleteCrossKindTrackStages.cs` | Data-fix migration: delete orphan cross-kind stage rows from `feature_track_stages` |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/FeatureTrackDetailResponse.cs` | Response record with TrackOwner and Stages with per-stage StageOwner |

### Modified Files

| File | Change |
|------|--------|
| `OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs` | `SeedTracksAsync` uses `FeatureTrackStageScope.AdmittedKeys(kind)` per track (5 keys each, not 6 shared) |
| `OneMoreTaskTracker.Features/Features/Update/PatchFeatureTrackStageRequestValidator.cs` | Added admission rule rejecting cross-kind stage keys with `InvalidArgument` |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/FeatureTrackStageResponse.cs` | Added `StageOwner: MiniTeamMemberResponse?` field (5th parameter) |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/FeatureTrackSummaryResponse.cs` | Added `FromDetail(track, roster)` factory; `StageFrom` now accepts optional roster for owner resolution |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeatureDetailResponse.cs` | Added `IReadOnlyList<FeatureTrackDetailResponse> Tracks` as 6th parameter |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeaturesController.cs` | `Get()` projects tracks via `FromDetail`, includes them in response |
| `tests/.../Controllers/PatchFeatureTrackStageControllerTests.cs` | Added cross-kind rejection tests (Backend+SrApproving → 400, Frontend+CsApproving → 400) |
| `tests/.../Controllers/PlanControllerStagePlansTests.cs` | Added `GetFeature_IncludesTracksWithResolvedTrackOwner` and `GetFeature_WhenTrackOwnerIdIsStale_TrackOwnerIsNull` |
| `tests/.../Features/Update/PatchFeatureTrackStageHandlerTests.cs` | Added cross-kind handler tests; fixed existing overlap test to use `Development` instead of `CsApproving` |

---

## Test Results

All 547 tests pass across 5 test projects (0 failures, 0 skipped).

| Project | Passed |
|---------|--------|
| Features.Tests | 143 |
| Api.Tests | 228 |
| Users.Tests | 45 |
| Tasks.Tests | 68 |
| GitLab.Proxy.Tests | 63 |

---

## Contract Artifact

**Path**: `OneMoreTaskTracker.Api/openapi.json`
**Version**: v1 (frozen; no changes this iteration)
**Regenerated**: no — endpoint shapes unchanged; `tracks` array was always in contract, now populated

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
