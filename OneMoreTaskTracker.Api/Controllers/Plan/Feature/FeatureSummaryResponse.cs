using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Taxonomy;

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
    FeatureTaxonomyResponse Taxonomy,
    int Version)
{
    internal static FeatureSummaryResponse From<T>(T f, IReadOnlyDictionary<int, List<int>> tasksByFeature)
        where T : IFeatureSummaryProjection
    {
        IReadOnlyList<int> taskIds = tasksByFeature.TryGetValue(f.Id, out var ids) ? ids : [];
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
            FeatureTaxonomyProjector.FromProto(f.Taxonomy),
            f.Version);
    }
}
