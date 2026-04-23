namespace OneMoreTaskTracker.Features.Features.Data;

public class Feature
{
    public int Id { get; init; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int State { get; set; } = (int)FeatureState.CsApproving;

    // Derived server-side (see StagePlanUpserter.RecomputeFeatureDates) from the
    // min/max of non-null stage dates. They are no longer independently editable
    // through the REST layer — api-contract.md v1.
    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }

    public int LeadUserId { get; set; }
    public int ManagerUserId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Cascade-delete configured in FeaturesDbContext.OnModelCreating. Always
    // exactly 5 rows per feature (materialized on create + guaranteed by the
    // composite unique index on (FeatureId, Stage)).
    public List<FeatureStagePlan> StagePlans { get; init; } = [];
}
