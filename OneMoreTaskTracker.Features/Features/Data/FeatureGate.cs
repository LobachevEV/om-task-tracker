using OneMoreTaskTracker.Features.Features.Update;

namespace OneMoreTaskTracker.Features.Features.Data;

public class FeatureGate : ITrackedEntity
{
    public int Id { get; init; }
    public int FeatureId { get; init; }

    public required string GateKey { get; init; }
    public GateKind Kind { get; init; }
    public Track? Track { get; init; }

    public GateStatus Status { get; private set; } = GateStatus.Waiting;
    public int ApproverUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public DateTime? RequestedAtUtc { get; private set; }
    public string? RejectionReason { get; private set; }

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

    public void MarkRequested(DateTime now)
    {
        RequestedAtUtc = now;
    }

    public void Approve(int callerUserId, DateTime now)
    {
        Status = GateStatus.Approved;
        ApproverUserId = callerUserId;
        ApprovedAtUtc = now;
        RejectionReason = null;
    }

    public void Reject(string reason, int callerUserId)
    {
        Status = GateStatus.Rejected;
        ApproverUserId = callerUserId;
        ApprovedAtUtc = null;
        RejectionReason = reason;
    }

    public void ResetToWaiting(DateTime now)
    {
        Status = GateStatus.Waiting;
        ApproverUserId = 0;
        ApprovedAtUtc = null;
        RejectionReason = null;
        RequestedAtUtc = now;
    }

    public void ApplyStatusPatch(string status, string? rejectionReason, int callerUserId, DateTime now)
    {
        switch ((status ?? string.Empty).ToLowerInvariant())
        {
            case "approved":
                Approve(callerUserId, now);
                break;
            case "rejected":
                Reject((rejectionReason ?? string.Empty).Trim(), callerUserId);
                break;
            case "waiting":
                ResetToWaiting(now);
                break;
            default:
                throw new InvalidGateStatusException(status ?? string.Empty);
        }
    }
}
