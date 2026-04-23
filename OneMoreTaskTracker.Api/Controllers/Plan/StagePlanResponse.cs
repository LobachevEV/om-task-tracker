namespace OneMoreTaskTracker.Api.Controllers;

public record StagePlanResponse(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId);
