namespace OneMoreTaskTracker.Api.Controllers;

public record StagePlanPayload(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId);
