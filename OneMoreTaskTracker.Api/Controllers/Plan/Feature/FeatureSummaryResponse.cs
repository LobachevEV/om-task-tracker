using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;
using OneMoreTaskTracker.Proto.Users;

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
    int Version,
    string? CsApprovingPlannedStart,
    string? CsApprovingPlannedEnd,
    int? CsApprovingOwnerUserId,
    string? DevelopmentPlannedStart,
    string? DevelopmentPlannedEnd,
    int? DevelopmentOwnerUserId,
    string? TestingPlannedStart,
    string? TestingPlannedEnd,
    int? TestingOwnerUserId,
    string? EthalonTestingPlannedStart,
    string? EthalonTestingPlannedEnd,
    int? EthalonTestingOwnerUserId,
    string? LiveReleasePlannedStart,
    string? LiveReleasePlannedEnd,
    int? LiveReleaseOwnerUserId,
    IReadOnlyList<FeatureTrackSummaryResponse>? Tracks)
{
    internal static FeatureSummaryResponse From<T>(
        T f,
        IReadOnlyDictionary<int, List<int>> tasksByFeature,
        IReadOnlyDictionary<int, TeamRosterMember>? roster = null)
        where T : IFeatureSummaryProjection
    {
        IReadOnlyList<int> taskIds = tasksByFeature.TryGetValue(f.Id, out var ids) ? ids : [];
        var trackList = f.Tracks.Select(t => FeatureTrackSummaryResponse.From(t, roster)).ToList();
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
            f.Version,
            string.IsNullOrEmpty(f.CsApprovingPlannedStart) ? null : f.CsApprovingPlannedStart,
            string.IsNullOrEmpty(f.CsApprovingPlannedEnd) ? null : f.CsApprovingPlannedEnd,
            f.CsApprovingOwnerUserId > 0 ? f.CsApprovingOwnerUserId : null,
            string.IsNullOrEmpty(f.DevelopmentPlannedStart) ? null : f.DevelopmentPlannedStart,
            string.IsNullOrEmpty(f.DevelopmentPlannedEnd) ? null : f.DevelopmentPlannedEnd,
            f.DevelopmentOwnerUserId > 0 ? f.DevelopmentOwnerUserId : null,
            string.IsNullOrEmpty(f.TestingPlannedStart) ? null : f.TestingPlannedStart,
            string.IsNullOrEmpty(f.TestingPlannedEnd) ? null : f.TestingPlannedEnd,
            f.TestingOwnerUserId > 0 ? f.TestingOwnerUserId : null,
            string.IsNullOrEmpty(f.EthalonTestingPlannedStart) ? null : f.EthalonTestingPlannedStart,
            string.IsNullOrEmpty(f.EthalonTestingPlannedEnd) ? null : f.EthalonTestingPlannedEnd,
            f.EthalonTestingOwnerUserId > 0 ? f.EthalonTestingOwnerUserId : null,
            string.IsNullOrEmpty(f.LiveReleasePlannedStart) ? null : f.LiveReleasePlannedStart,
            string.IsNullOrEmpty(f.LiveReleasePlannedEnd) ? null : f.LiveReleasePlannedEnd,
            f.LiveReleaseOwnerUserId > 0 ? f.LiveReleaseOwnerUserId : null,
            trackList);
    }
}
