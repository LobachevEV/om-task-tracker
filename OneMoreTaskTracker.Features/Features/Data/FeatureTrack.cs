namespace OneMoreTaskTracker.Features.Features.Data;

public class FeatureTrack
{
    public int Id { get; private set; }
    public int FeatureId { get; private set; }

    // Stored as int to avoid cross-provider enum mapping differences.
    // 0 = Frontend, 1 = Backend (matches FeatureTrackKind proto enum).
    public int Kind { get; private set; }

    // Soft cross-service FK to the Users service. No DB-level FK constraint.
    public int TrackOwnerUserId { get; private set; }

    public int Version { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public List<FeatureTrackStage> Stages { get; init; } = [];

    public static FeatureTrack Create(int featureId, int kind, int ownerUserId, DateTime now) =>
        new()
        {
            FeatureId = featureId,
            Kind = kind,
            TrackOwnerUserId = ownerUserId,
            Version = 0,
            CreatedAt = now,
            UpdatedAt = now,
        };

    public void AssignOwner(int ownerUserId, DateTime now)
    {
        TrackOwnerUserId = ownerUserId;
        Version += 1;
        UpdatedAt = now;
    }

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
    }
}
