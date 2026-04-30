namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

public record FeatureSubStageResponse(
    int Id,
    string Track,
    string Phase,
    int Ordinal,
    int? OwnerUserId,
    string? PlannedStart,
    string? PlannedEnd,
    int Version);
