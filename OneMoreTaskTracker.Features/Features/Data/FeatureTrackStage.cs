namespace OneMoreTaskTracker.Features.Features.Data;

public class FeatureTrackStage
{
    public int Id { get; private set; }
    public int FeatureTrackId { get; private set; }

    // Stored as int to avoid cross-provider enum mapping differences.
    // Ordinals per FeatureTrackStageKey: SR_APPROVING=1, CS_APPROVING=2,
    // DEVELOPMENT=3, STAND_TESTING=4, ETHALON_TESTING=5, RELEASE_TO_LIVE=6.
    public int StageKey { get; private set; }

    public DateOnly? PlannedStart { get; private set; }
    public DateOnly? PlannedEnd { get; private set; }

    // Null = inherit from track owner. Soft cross-service FK to Users service.
    public int? StageOwnerUserId { get; private set; }

    public int Version { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public static FeatureTrackStage Create(int featureTrackId, int stageKey, DateTime now) =>
        new()
        {
            FeatureTrackId = featureTrackId,
            StageKey = stageKey,
            PlannedStart = null,
            PlannedEnd = null,
            StageOwnerUserId = null,
            Version = 0,
            CreatedAt = now,
            UpdatedAt = now,
        };

    // sentinel: -1 = clear (revert to inheritance), 0 = unchanged, >0 = explicit user id
    public void AssignOwner(int sentinelOrUserId, DateTime now)
    {
        StageOwnerUserId = sentinelOrUserId > 0 ? sentinelOrUserId : null;
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

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
    }
}
