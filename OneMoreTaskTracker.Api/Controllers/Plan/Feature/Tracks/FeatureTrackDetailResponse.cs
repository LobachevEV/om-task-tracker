namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record FeatureTrackDetailResponse(
    int Id,
    int FeatureId,
    string Kind,
    int TrackOwnerUserId,
    MiniTeamMemberResponse? TrackOwner,
    int Version,
    IReadOnlyList<FeatureTrackStageResponse> Stages);
