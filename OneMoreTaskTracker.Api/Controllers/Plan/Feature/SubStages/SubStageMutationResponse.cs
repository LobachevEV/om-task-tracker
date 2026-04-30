using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.SubStages;

public record SubStageMutationResponse(
    int FeatureId,
    int FeatureVersion,
    int? CreatedSubStageId,
    FeatureTaxonomyResponse Taxonomy);
