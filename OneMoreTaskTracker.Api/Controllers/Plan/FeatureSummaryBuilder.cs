using OneMoreTaskTracker.Api.Controllers.Plan.Feature;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;
using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan;

internal static class FeatureSummaryBuilder
{
    internal static FeatureSummaryResponse MapSummary<T>(
        T f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        ILogger logger)
        where T : IFeatureSummaryProjection
    {
        var taskIds = tasksByFeature.TryGetValue(f.Id, out var ids) ? (IReadOnlyList<int>)ids : Array.Empty<int>();
        var plans = f.StagePlans.Select(sp => BuildStagePlan(sp, logger)).ToList();
        return new FeatureSummaryResponse(
            f.Id,
            f.Title,
            string.IsNullOrEmpty(f.Description) ? null : f.Description,
            FeatureStateMapper.MapState(f.State, logger),
            string.IsNullOrEmpty(f.PlannedStart) ? null : f.PlannedStart,
            string.IsNullOrEmpty(f.PlannedEnd)   ? null : f.PlannedEnd,
            f.LeadUserId,
            f.ManagerUserId,
            taskIds.Count,
            taskIds,
            plans,
            f.Version);
    }

    internal static StagePlanResponse BuildStagePlan(FeatureStagePlan sp, ILogger logger) =>
        new(
            FeatureStateMapper.MapState(sp.Stage, logger),
            string.IsNullOrEmpty(sp.PlannedStart) ? null : sp.PlannedStart,
            string.IsNullOrEmpty(sp.PlannedEnd)   ? null : sp.PlannedEnd,
            sp.PerformerUserId > 0 ? (int?)sp.PerformerUserId : null,
            sp.Version);
}
