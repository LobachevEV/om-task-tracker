namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

public record FeatureTrackResponse(
    string Track,
    IReadOnlyList<FeaturePhaseResponse> Phases);
