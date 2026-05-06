namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record PatchFeatureTrackStagePayload(
    int? StageOwnerUserId,
    string? PlannedStart,
    string? PlannedEnd,
    int? ExpectedStageVersion);
