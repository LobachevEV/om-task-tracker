namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Stages;

// Performer is null when the stage is unassigned or the stored performer id is
// no longer on the manager's roster (stale). The stale case still emits
// performerUserId so the FE can render "Performer no longer on team"; the
// performer slot itself is null to avoid an empty-string that fails Zod email()/min(1).
public record StagePlanDetailResponse(
    string Stage,
    string? PlannedStart,
    string? PlannedEnd,
    int? PerformerUserId,
    MiniTeamMemberResponse? Performer,
    // Feature-level optimistic-concurrency token. The per-stage PATCH endpoint
    // has been consolidated onto PATCH /api/plan/features/{id}; clients use the
    // feature version for If-Match.
    int Version);
