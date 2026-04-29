using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Proto.Features.UpdateFeatureLeadCommand;

public sealed partial class FeatureDto : IFeatureSummaryProjection
{
    IEnumerable<FeatureStagePlan> IFeatureSummaryProjection.StagePlans => StagePlans;
}
