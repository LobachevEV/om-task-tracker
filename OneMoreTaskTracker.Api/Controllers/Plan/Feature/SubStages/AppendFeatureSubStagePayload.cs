namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

public record AppendFeatureSubStagePayload(
    int? OwnerUserId,
    string? PlannedStart,
    string? PlannedEnd);
