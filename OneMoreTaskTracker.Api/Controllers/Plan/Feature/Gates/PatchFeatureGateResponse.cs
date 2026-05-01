using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Gates;

public record PatchFeatureGateResponse(
    int FeatureId,
    int FeatureVersion,
    FeatureTaxonomyResponse Taxonomy);
