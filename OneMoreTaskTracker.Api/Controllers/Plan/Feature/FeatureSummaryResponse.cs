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
    // Monotonically-increasing row version used as an optimistic-concurrency
    // token (api-contract.md § "Optimistic Concurrency"). Bumped by every
    // inline-edit PATCH. Additive on v1 — legacy clients can ignore.
    int Version);
