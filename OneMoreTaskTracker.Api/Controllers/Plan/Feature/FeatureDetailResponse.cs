using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record FeatureDetailResponse(
    FeatureSummaryResponse Feature,
    IReadOnlyList<AttachedTaskResponse> Tasks,
    MiniTeamMemberResponse Lead,
    IReadOnlyList<MiniTeamMemberResponse> MiniTeam,
    IReadOnlyList<StagePlanDetailResponse> StagePlans);
