using OneMoreTaskTracker.Api.Roster;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

public record PatchFeatureStagePayload(
    int? StageOwnerUserId,
    string? PlannedStart,
    string? PlannedEnd,
    int? ExpectedStageVersion) : IHasTeamMemberId
{
    public int? TeamMemberId => StageOwnerUserId;
}
