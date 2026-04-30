using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Proto.Features.CreateFeatureCommand
{
    public sealed partial class FeatureDto : IFeatureSummaryProjection
    {
        IEnumerable<FeatureStagePlan> IFeatureSummaryProjection.StagePlans => StagePlans;
    }
}

namespace OneMoreTaskTracker.Proto.Features.GetFeatureQuery
{
    public sealed partial class FeatureDto : IFeatureSummaryProjection
    {
        IEnumerable<FeatureStagePlan> IFeatureSummaryProjection.StagePlans => StagePlans;
    }
}

namespace OneMoreTaskTracker.Proto.Features.ListFeaturesQuery
{
    public sealed partial class FeatureDto : IFeatureSummaryProjection
    {
        IEnumerable<FeatureStagePlan> IFeatureSummaryProjection.StagePlans => StagePlans;
    }
}

namespace OneMoreTaskTracker.Proto.Features.PatchFeatureCommand
{
    public sealed partial class FeatureDto : IFeatureSummaryProjection
    {
        IEnumerable<FeatureStagePlan> IFeatureSummaryProjection.StagePlans => StagePlans;
    }
}

namespace OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand
{
    public sealed partial class FeatureDto : IFeatureSummaryProjection
    {
        IEnumerable<FeatureStagePlan> IFeatureSummaryProjection.StagePlans => StagePlans;
    }
}
