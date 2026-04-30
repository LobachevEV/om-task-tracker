using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

public record StagePlanResponse(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId,
    // Per-stage optimistic-concurrency token (api-contract.md
    // § "Optimistic Concurrency"). Consumed by the FE inline editor's
    // If-Match header for stage-scoped PATCHes.
    int StageVersion)
{
    internal static StagePlanResponse From(FeatureStagePlan sp) =>
        new(
            sp.Stage.ToWireString(),
            string.IsNullOrEmpty(sp.PlannedStart) ? null : sp.PlannedStart,
            string.IsNullOrEmpty(sp.PlannedEnd) ? null : sp.PlannedEnd,
            sp.PerformerUserId > 0 ? sp.PerformerUserId : null,
            sp.Version);
}
