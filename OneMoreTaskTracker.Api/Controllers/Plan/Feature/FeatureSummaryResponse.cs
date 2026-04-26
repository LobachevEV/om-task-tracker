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
    int Version);
