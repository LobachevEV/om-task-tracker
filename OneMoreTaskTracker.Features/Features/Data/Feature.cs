namespace OneMoreTaskTracker.Features.Features.Data;

public class Feature
{
    public int Id { get; init; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int State { get; set; } = (int)FeatureState.CsApproving;

    // Derived server-side (see StagePlanUpserter.RecomputeFeatureDates) from the
    // min/max of non-null stage dates. Not independently editable via REST.
    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }

    public int LeadUserId { get; set; }
    public int ManagerUserId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    // Cascade-delete configured in FeaturesDbContext.OnModelCreating. Always
    // exactly 5 rows per feature (materialized on create + guaranteed by the
    // composite unique index on (FeatureId, Stage)).
    public List<FeatureStagePlan> StagePlans { get; init; } = [];

    // Optimistic-concurrency token bumped by every feature-scoped and
    // stage-scoped PATCH so clients can detect "updated by someone else" and
    // reconcile. EF Core's IsConcurrencyToken mapping lives in
    // FeaturesDbContext.OnModelCreating.
    public int Version { get; private set; }

    public void RenameTitle(string newTitle, DateTime now)
    {
        Title = newTitle ?? throw new ArgumentNullException(nameof(newTitle));
        Version += 1;
        UpdatedAt = now;
    }

    public void SetDescription(string? newDescription, DateTime now)
    {
        Description = newDescription;
        Version += 1;
        UpdatedAt = now;
    }

    public void AssignLead(int leadUserId, DateTime now)
    {
        LeadUserId = leadUserId;
        Version += 1;
        UpdatedAt = now;
    }

    public void RecordStageEdit(DateTime now)
    {
        Version += 1;
        UpdatedAt = now;
    }

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
    }
}
