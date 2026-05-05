namespace OneMoreTaskTracker.Features.Features.Data;

public class FeatureSubStage : ITrackedEntity
{
    public int Id { get; init; }
    public int FeatureId { get; init; }

    public Track Track { get; init; }
    public PhaseKind PhaseKind { get; init; }

    public short Ordinal { get; private set; } = 1;

    public int OwnerUserId { get; private set; }
    public DateOnly? PlannedStart { get; private set; }
    public DateOnly? PlannedEnd { get; private set; }

    public int Version { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

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

    public void AssignOwner(int ownerUserId)
    {
        OwnerUserId = ownerUserId;
    }

    public void SetPlannedStart(DateOnly? plannedStart)
    {
        PlannedStart = plannedStart;
    }

    public void SetPlannedEnd(DateOnly? plannedEnd)
    {
        PlannedEnd = plannedEnd;
    }

    public void Reposition(short ordinal)
    {
        Ordinal = ordinal;
    }

    public void SeedOrdinal(short ordinal)
    {
        Ordinal = ordinal;
    }

    public void SeedOwner(int ownerUserId)
    {
        OwnerUserId = ownerUserId;
    }

    public void SeedDates(DateOnly? plannedStart, DateOnly? plannedEnd)
    {
        PlannedStart = plannedStart;
        PlannedEnd = plannedEnd;
    }
}
