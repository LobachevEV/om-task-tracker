namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

public record StagePlanPayload(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId);
