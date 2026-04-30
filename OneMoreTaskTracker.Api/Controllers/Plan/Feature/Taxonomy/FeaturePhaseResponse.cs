namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

public record FeaturePhaseResponse(
    string Phase,
    bool MultiOwner,
    int Cap,
    IReadOnlyList<FeatureSubStageResponse> SubStages);
