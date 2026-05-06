using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record FeatureDetailResponse(
    FeatureSummaryResponse Feature,
    IReadOnlyList<AttachedTaskResponse> Tasks,
    MiniTeamMemberResponse Lead,
    IReadOnlyList<MiniTeamMemberResponse> MiniTeam,
    IReadOnlyList<StagePlanDetailResponse> StagePlans,
    IReadOnlyList<FeatureTrackDetailResponse> Tracks);
