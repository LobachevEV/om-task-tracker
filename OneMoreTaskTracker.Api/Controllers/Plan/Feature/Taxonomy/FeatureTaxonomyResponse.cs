namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

public record FeatureTaxonomyResponse(
    IReadOnlyList<FeatureGateResponse> Gates,
    IReadOnlyList<FeatureTrackResponse> Tracks);
