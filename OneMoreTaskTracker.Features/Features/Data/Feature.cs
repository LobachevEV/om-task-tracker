namespace OneMoreTaskTracker.Features.Features.Data;

public class Feature
{
    public int Id { get; init; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int State { get; set; } = (int)FeatureState.CsApproving;

    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }

    public int LeadUserId { get; set; }
    public int ManagerUserId { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
