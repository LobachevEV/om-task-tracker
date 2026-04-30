using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal interface IFeatureSummaryProjection
{
    int Id { get; }
    string Title { get; }
    string Description { get; }
    FeatureState State { get; }
    string PlannedStart { get; }
    string PlannedEnd { get; }
    int LeadUserId { get; }
    int ManagerUserId { get; }
    IEnumerable<FeatureStagePlan> StagePlans { get; }
    int Version { get; }
}
