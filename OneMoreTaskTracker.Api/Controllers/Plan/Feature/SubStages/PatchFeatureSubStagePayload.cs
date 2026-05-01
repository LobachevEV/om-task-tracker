namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

public record PatchFeatureSubStagePayload(
    int? OwnerUserId,
    string? PlannedStart,
    string? PlannedEnd,
    int? ExpectedVersion);
