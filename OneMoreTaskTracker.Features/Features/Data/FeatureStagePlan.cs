namespace OneMoreTaskTracker.Features.Features.Data;

// One row per (FeatureId, Stage). Exactly 5 rows per feature are materialized
// on Create and guaranteed by the unique composite index on (FeatureId, Stage)
// (see FeaturesDbContext.OnModelCreating). Stage mirrors FeatureState ordinals
// 0..4 — kept as a plain `int` column to avoid cross-provider enum-mapping
// differences; enum parsing stays at the handler boundary.
public class FeatureStagePlan
{
    public int Id { get; init; }
    public int FeatureId { get; init; }

    public int Stage { get; set; }

    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }

    // Soft cross-service FK to the Users service's user id. No DB-level FK
    // (per microservices-data.md). `0` (proto3 scalar default) = unassigned.
    public int PerformerUserId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Per-stage optimistic-concurrency token (see api-contract.md
    // § "Optimistic Concurrency"). Bumped by every stage-scoped PATCH (owner,
    // planned-start, planned-end). Exposed via StagePlanDetail.stageVersion.
    public int Version { get; set; }
}
