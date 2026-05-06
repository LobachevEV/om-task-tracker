namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record FeatureTrackStageResponse(
    string StageKey,
    string? PlannedStart,
    string? PlannedEnd,
    int? StageOwnerUserId,
    MiniTeamMemberResponse? StageOwner,
    int StageVersion);
