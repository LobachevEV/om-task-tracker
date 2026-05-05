namespace OneMoreTaskTracker.Features.Features.Data;

public class Feature : ITrackedEntity
{
    public int Id { get; init; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int State { get; set; } = (int)FeatureState.CsApproving;
    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }

    public int LeadUserId { get; set; }
    public int ManagerUserId { get; set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public List<FeatureGate> Gates { get; init; } = [];
    public List<FeatureSubStage> SubStages { get; init; } = [];

    public int Version { get; private set; }

    int ITrackedEntity.Version
    {
        get => Version;
        set => Version = value;
    }

    DateTime ITrackedEntity.CreatedAt
    {
        get => CreatedAt;
        set => CreatedAt = value;
    }

    DateTime ITrackedEntity.UpdatedAt
    {
        get => UpdatedAt;
        set => UpdatedAt = value;
    }

    public FeatureGate? ResolveGate(string gateKey) =>
        Gates.FirstOrDefault(g => g.GateKey == gateKey);

    public FeatureSubStage? ResolveSubStage(int subStageId) =>
        SubStages.FirstOrDefault(s => s.Id == subStageId);

    public void RenameTitle(string newTitle)
    {
        Title = newTitle ?? throw new ArgumentNullException(nameof(newTitle));
    }

    public void SetDescription(string? newDescription)
    {
        Description = newDescription;
    }

    public void AssignLead(int leadUserId)
    {
        LeadUserId = leadUserId;
    }
}
