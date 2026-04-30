using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record FeatureSummaryResponse(
    int Id,
    string Title,
    string? Description,
    string State,
    string? PlannedStart,
    string? PlannedEnd,
    int LeadUserId,
    int ManagerUserId,
    int TaskCount,
    IReadOnlyList<int> TaskIds,
    IReadOnlyList<StagePlanResponse> StagePlans,
    // Optimistic-concurrency token. Bumped by every inline-edit PATCH;
    // legacy clients that ignore it stay last-write-wins.
    int Version)
{
    internal static FeatureSummaryResponse From<T>(T f, IReadOnlyDictionary<int, List<int>> tasksByFeature)
        where T : IFeatureSummaryProjection
    {
        var taskIds = tasksByFeature.TryGetValue(f.Id, out var ids) ? (IReadOnlyList<int>)ids : Array.Empty<int>();
        return new FeatureSummaryResponse(
            f.Id,
            f.Title,
            string.IsNullOrEmpty(f.Description) ? null : f.Description,
            f.State.ToWireString(),
            string.IsNullOrEmpty(f.PlannedStart) ? null : f.PlannedStart,
            string.IsNullOrEmpty(f.PlannedEnd) ? null : f.PlannedEnd,
            f.LeadUserId,
            f.ManagerUserId,
            taskIds.Count,
            taskIds,
            f.StagePlans.Select(StagePlanResponse.From).ToList(),
            f.Version);
    }
}
