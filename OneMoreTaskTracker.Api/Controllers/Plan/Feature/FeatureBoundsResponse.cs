namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record FeatureBoundsResponse(
    string? EarliestPlannedStart,
    string? LatestPlannedEnd);
