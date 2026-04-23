namespace OneMoreTaskTracker.Api.Controllers;

public record FeatureDetailResponse(
    FeatureSummaryResponse Feature,
    IReadOnlyList<AttachedTaskResponse> Tasks,
    MiniTeamMemberResponse Lead,
    IReadOnlyList<MiniTeamMemberResponse> MiniTeam,
    IReadOnlyList<StagePlanDetailResponse> StagePlans);
