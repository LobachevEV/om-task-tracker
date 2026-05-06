# Backend Generator State — feature-tracks-gantt

## Iteration

**Current**: 4
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
| CT-003-01 / BE-003-01 (AUTO-FAIL) | Migration `20260506150000_DeleteCrossKindTrackStages` was hand-written without a Designer.cs companion, so EF Core silently skipped it — orphan stage rows persisted; live DB still had 6 stages per track | Deleted the hand-written pair; re-generated via `dotnet ef migrations add DeleteCrossKindTrackStages` (timestamp `20260506201111`) — emits proper Designer.cs with `[DbContext]` + `[Migration]` attributes; migration now discovered and applied |
| BE-003-02 | `EnsureStageOrder` overlap envelope used field `"with"` instead of contract-specified `"neighbour"` | Fixed `ConflictDetail.StageOrderOverlap()` to emit `neighbour`; added private `StageKeyName(int)` switch in `PatchFeatureTrackStageHandler` to replace the unavailable `ToWireString()` (which lives only in the API project) |
| BE-003-03 | List endpoint `GET /api/plan/features` emitted null `stageOwner` for all stages (roster not loaded) | Loaded roster once per list call (safe: list is always single-manager-scoped); threaded optional `roster` parameter through `FeatureSummaryResponse.From()` and `FeatureTrackSummaryResponse.From()` |

### New Files

| File | Purpose |
|------|---------|
| `OneMoreTaskTracker.Features/Migrations/20260506201111_DeleteCrossKindTrackStages.cs` | EF-generated migration (replaces hand-written one) — deletes orphan cross-kind stage rows |
| `OneMoreTaskTracker.Features/Migrations/20260506201111_DeleteCrossKindTrackStages.Designer.cs` | EF-generated designer companion with `[DbContext]` + `[Migration]` attributes |
| `tests/OneMoreTaskTracker.Features.Tests/Features/Data/FeatureTrackStageScopeTests.cs` | 7 unit tests covering `AdmittedKeys()` and `IsAdmittedFor()` for Frontend and Backend kinds |

### Modified Files

| File | Change |
|------|--------|
| `OneMoreTaskTracker.Features/Features/Update/ConflictDetail.cs` | `StageOrderOverlap()` emits `neighbour` field instead of `with` |
| `OneMoreTaskTracker.Features/Features/Update/PatchFeatureTrackStageHandler.cs` | Added private `StageKeyName(int)` switch; `EnsureStageOrder` uses it for the conflict envelope |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeatureSummaryResponse.cs` | `From()` accepts optional `IReadOnlyDictionary<int, TeamRosterMember>? roster` parameter; passes it through to track mapping |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/Tracks/FeatureTrackSummaryResponse.cs` | `From()` accepts optional roster; `StageFrom` resolves `stageOwner` when roster is provided |
| `OneMoreTaskTracker.Api/Controllers/Plan/Feature/FeaturesController.cs` | `List()` loads roster once and passes to `FeatureSummaryResponse.From()`; `Get()` passes roster to summary build |
| `tests/OneMoreTaskTracker.Features.Tests/DevFeatureSeederTests.cs` | Added 3 tests: EachSeededTrackHasExactlyFiveStages, FrontendTracksDoNotContainCsApproving, BackendTracksDoNotContainSrApproving |
| `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureStageHandlerTests.cs` | Updated overlap test assertion from `"with"` to `"neighbour"` |
| `tests/OneMoreTaskTracker.Features.Tests/Features/Update/PatchFeatureTrackStageHandlerTests.cs` | Updated overlap test assertion from `"with"` to `"neighbour"` |

---

## Test Results

All 158 tests pass in Features.Tests (0 failures, 0 skipped).

| Project | Passed |
|---------|--------|
| Features.Tests | 158 |

---

## Contract Artifact

**Path**: `OneMoreTaskTracker.Api/openapi.json`
**Version**: v1 (frozen; no changes this iteration)
**Regenerated**: no — endpoint shapes unchanged

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
