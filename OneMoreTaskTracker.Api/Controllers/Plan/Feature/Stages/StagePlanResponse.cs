namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

public record StagePlanResponse(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId,
    // Per-stage optimistic-concurrency token (api-contract.md
    // § "Optimistic Concurrency"). Consumed by the FE inline editor's
    // If-Match header for stage-scoped PATCHes.
    int StageVersion);
