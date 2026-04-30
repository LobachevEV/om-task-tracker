namespace OneMoreTaskTracker.Features.Features.Data;

public class FeatureSubStage
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
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; private set; }

    public void AssignOwner(int ownerUserId, DateTime now)
    {
        OwnerUserId = ownerUserId;
        Version += 1;
        UpdatedAt = now;
    }

    public void SetPlannedStart(DateOnly? plannedStart, DateTime now)
    {
        PlannedStart = plannedStart;
        Version += 1;
        UpdatedAt = now;
    }

    public void SetPlannedEnd(DateOnly? plannedEnd, DateTime now)
    {
        PlannedEnd = plannedEnd;
        Version += 1;
        UpdatedAt = now;
    }

    public void Reposition(short ordinal, DateTime now)
    {
        Ordinal = ordinal;
        UpdatedAt = now;
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

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
    }
}
