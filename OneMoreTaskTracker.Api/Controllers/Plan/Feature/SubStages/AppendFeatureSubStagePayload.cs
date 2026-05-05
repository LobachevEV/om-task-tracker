namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

// All fields optional by contract: server fills owner=0 (unassigned) and dates from previous sibling.
public record AppendFeatureSubStagePayload(
    int? OwnerUserId,
    string? PlannedStart,
    string? PlannedEnd) : IHasTeammateUserId
{
    int? IHasTeammateUserId.TeammateUserId => OwnerUserId;
}
