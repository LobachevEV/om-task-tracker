namespace OneMoreTaskTracker.Api.Controllers;

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
    // Per-stage optimistic-concurrency token exposed on the detail surface so
    // the inline editor's If-Match header can target stage rows independently.
    int StageVersion);
