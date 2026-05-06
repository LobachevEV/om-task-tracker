# Backend Generator State — feature-tracks-gantt

## Iteration

**Current**: 1
**Digest Version Consumed**: 1 (initial)

---

## Status

**Phase**: A — Skeleton + Real Persistence (complete)
**Contract**: Frozen v1 (set this iteration)
**CONTRACT_BUMP**: false

---

## What Was Done This Iteration

### New Files — OneMoreTaskTracker.Features

| File | Purpose |
|------|---------|
| `Features/Data/FeatureTrack.cs` | Aggregate entity; private setters; `AssignOwner` / `Touch` mutators |
| `Features/Data/FeatureTrackStage.cs` | Child entity; `SetPlannedStart` / `SetPlannedEnd` / `AssignOwner` mutators |
| `Features/Update/PatchFeatureTrackHandler.cs` | gRPC handler: upsert track + all 6 stage rows; version guard; log |
| `Features/Update/PatchFeatureTrackStageHandler.cs` | gRPC handler: upsert stage row; stage-order enforcement; log |
| `Features/Validation/PatchFeatureTrackRequestValidator.cs` | FluentValidation: FeatureId > 0, CallerUserId > 0, Kind != Unspecified |
| `Features/Validation/PatchFeatureTrackStageRequestValidator.cs` | FluentValidation: adds StageKey, date format checks |
| `Protos/feature_track_kind.proto` | `FeatureTrackKind` enum |
| `Protos/feature_track_stage_key.proto` | `FeatureTrackStageKey` enum (6 values) |
| `Protos/feature_track.proto` | `FeatureTrackDto`, `FeatureTrackStageDto` messages |
| `Protos/PatchFeatureTrackCommand/patch_feature_track_command_handler.proto` | `FeatureTrackPatcher` service + request message |
| `Protos/PatchFeatureTrackStageCommand/patch_feature_track_stage_command_handler.proto` | `FeatureTrackStagePatcher` service + request message |
| `Migrations/<ts>_AddFeatureTracks.cs` | Up: create `feature_tracks` + `feature_track_stages`; Down: drop both |

### Modified Files — OneMoreTaskTracker.Features

| File | Change |
|------|--------|
| `Features/Data/FeaturesDbContext.cs` | Added `DbSet<FeatureTrack>`, `DbSet<FeatureTrackStage>`; EF model config (unique indexes, concurrency tokens, cascade FK) |
| `Features/Data/Feature.cs` | Added `List<FeatureTrack> Tracks { get; init; }` navigation |
| `Features/Data/FeatureMappingConfig.cs` | Added `BuildProtoTracks()` + `BuildProtoTrackStages()`; extended all 5 dto registrations via `.AfterMapping` |
| `Features/Data/DevFeatureSeeder.cs` | Seeded Frontend+Backend tracks (feature 1) and Backend track (feature 2) with 5 stages each |
| `Features/Get/GetFeatureHandler.cs` | Added `.Include(f => f.Tracks).ThenInclude(t => t.Stages)` to query |
| `Features/List/ListFeaturesHandler.cs` | Same Include chain addition |
| `Features/Update/FeatureDbContextExtensions.cs` | Added `LoadFeatureWithTracksAsync`, `SaveTrackAsync`, `SaveTrackStageAsync` |
| `Program.cs` | `MapGrpcService<PatchFeatureTrackHandler>()` and `MapGrpcService<PatchFeatureTrackStageHandler>()` |

### New Files — OneMoreTaskTracker.Api

| File | Purpose |
|------|---------|
| `Controllers/Plan/Feature/Tracks/PatchFeatureTrackController.cs` | PATCH `/api/plan/features/{featureId}/tracks/{kind}` |
| `Controllers/Plan/Feature/Tracks/PatchFeatureTrackStageController.cs` | PATCH `/api/plan/features/{featureId}/tracks/{kind}/stages/{stageKey}` |
| `Controllers/Plan/Feature/Tracks/TrackKindParser.cs` | Case-insensitive "frontend"/"backend" → `FeatureTrackKind` |
| `Controllers/Plan/Feature/Tracks/TrackStageKeyParser.cs` | Case-insensitive stage key string → `FeatureTrackStageKey` |
| `Controllers/Plan/Feature/Tracks/PatchFeatureTrackPayload.cs` | Gateway DTO: `int? TrackOwnerUserId`, `int? ExpectedVersion` |
| `Controllers/Plan/Feature/Tracks/PatchFeatureTrackStagePayload.cs` | Gateway DTO: `int? StageOwnerUserId`, `string? PlannedStart`, `string? PlannedEnd`, `int? ExpectedStageVersion` |

### Modified Files — OneMoreTaskTracker.Api

| File | Change |
|------|--------|
| `Program.cs` | Added `using` for `PatchFeatureTrackCommand` / `PatchFeatureTrackStageCommand`; registered two new `AddGrpcClient<>` entries |
| `OneMoreTaskTracker.Api.csproj` | Added 5 `<Protobuf>` entries for new Features protos |
| `openapi.json` | Added `FeatureTrackKind`, `FeatureTrackStageKey`, `FeatureTrackStage`, `FeatureTrackSummary`, `PatchFeatureTrackPayload`, `PatchFeatureTrackStagePayload` schemas; `tracks` optional field on `FeatureSummary` and `FeatureDetail`; two new PATCH paths |

---

## Contract Artifact

**Path**: `OneMoreTaskTracker.Api/openapi.json`
**Version**: v1 (frozen this iteration)
**Regenerated**: yes — hand-rolled document extended additively; no Swashbuckle/NSwag in project

---

## Open Issues

None. Phase A delivered in full. No contract drift. No disputed feedback (iteration 1).

---

## Disputed Feedback

None.

---

## Next Actions (Phase B — Iteration 2)

```json
[
  { "id": "BE-002-01", "priority": 1, "action": "Add PatchFeatureTrackHandlerTests (xUnit): upsert create, upsert update, no-op, ownership guard, version guard, NotFound" },
  { "id": "BE-002-02", "priority": 2, "action": "Add PatchFeatureTrackStageHandlerTests: sentinel owner clear, stage-order enforcement, sparse fields, version guards, create-if-not-exists" },
  { "id": "BE-002-03", "priority": 3, "action": "Add PatchFeatureTrackController integration tests (WebApplicationFactory): happy path, 400 bad kind/stageKey, 403 non-Manager, 404, 409, 422" },
  { "id": "BE-002-04", "priority": 4, "action": "Add GetFeatureController regression test: tracks field populated in response" }
]
```
