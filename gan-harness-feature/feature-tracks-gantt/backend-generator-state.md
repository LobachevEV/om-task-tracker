# Backend Generator State — feature-tracks-gantt

## Iteration

**Current**: 2
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
| BE-001-01a | Missing PatchFeatureTrackHandlerTests | Added `tests/.../Features/Update/PatchFeatureTrackHandlerTests.cs` (10 tests) |
| BE-001-01b | Missing PatchFeatureTrackStageHandlerTests | Added `tests/.../Features/Update/PatchFeatureTrackStageHandlerTests.cs` (12 tests) |
| BE-001-01c | Missing controller integration tests | Added `PatchFeatureTrackControllerTests.cs` (12 tests) and `PatchFeatureTrackStageControllerTests.cs` (15 tests) |
| BE-001-02 | `FeatureSummaryResponse.From` emitted null tracks for legacy features | Changed `trackList.Count > 0 ? trackList : null` to `trackList` (always emit array) |
| BE-001-04 | `DevFeatureSeeder` early-out prevented backfill on warm DBs | Split into `SeedFeaturesAsync` + `SeedTracksAsync` with independent guards |

### New Files

| File | Purpose |
|------|---------|
| `tests/.../Controllers/PatchFeatureTrackControllerTests.cs` | 12 integration tests: 200 happy path, 200 no-op, JWT forwarding, If-Match, 400 kind/owner/roster, 401, 403, 404, 403 perm-denied, 409 |
| `tests/.../Controllers/PatchFeatureTrackStageControllerTests.cs` | 15 integration tests: 200 happy path, 200 no-op, sparse field forwarding, If-Match, body-precedence, 400 kind/stageKey/roster/date-format, 401, 403, 404, 403 perm-denied, 409, 422 |
| `tests/.../Features/Update/PatchFeatureTrackHandlerTests.cs` | 10 handler unit tests covering upsert, default owner, version guard, ownership guard, NotFound |
| `tests/.../Features/Update/PatchFeatureTrackStageHandlerTests.cs` | 12 handler unit tests covering create, update, no-op idempotency, sparse fields, order guard, version guard, ownership guard |

### Modified Files

| File | Change |
|------|--------|
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeatureSummaryResponse.cs` | Always emit `tracks` array (never null) |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/PatchFeatureTrackStageController.cs` | Added `DateOnly.TryParseExact` validation for `PlannedStart` and `PlannedEnd` before forwarding to gRPC |
| `OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs` | Split into two independent methods with separate idempotency guards |
| `tests/.../Infra/TasksControllerWebApplicationFactory.cs` | Extended `ConfigureTestServices` to swap `FeatureTrackPatcher` and `FeatureTrackStagePatcher` mock clients |

---

## Test Results

All 541 tests pass across 5 test projects (0 failures, 0 skipped).

---

## Contract Artifact

**Path**: `OneMoreTaskTracker.Api/openapi.json`
**Version**: v1 (frozen; no changes this iteration)
**Regenerated**: no — no endpoint changes

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
