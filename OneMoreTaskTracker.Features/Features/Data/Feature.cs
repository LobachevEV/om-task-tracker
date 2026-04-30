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

    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; private set; }

    public List<FeatureGate> Gates { get; init; } = [];
    public List<FeatureSubStage> SubStages { get; init; } = [];

    public int Version { get; private set; }

    public FeatureGate? ResolveGate(string gateKey) =>
        Gates.FirstOrDefault(g => g.GateKey == gateKey);

    public FeatureSubStage? ResolveSubStage(int subStageId) =>
        SubStages.FirstOrDefault(s => s.Id == subStageId);

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

    public void RecordGateFlip(DateTime now)
    {
        Version += 1;
        UpdatedAt = now;
    }

    public void RecordSubStageMutation(DateTime now)
    {
        Version += 1;
        UpdatedAt = now;
    }

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
    }
}
