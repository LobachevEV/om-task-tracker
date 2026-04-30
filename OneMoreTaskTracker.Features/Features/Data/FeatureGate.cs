namespace OneMoreTaskTracker.Features.Features.Data;

public class FeatureGate
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
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; private set; }

    public void MarkRequested(DateTime now)
    {
        RequestedAtUtc = now;
        UpdatedAt = now;
    }

    public void Approve(int callerUserId, DateTime now)
    {
        Status = GateStatus.Approved;
        ApproverUserId = callerUserId;
        ApprovedAtUtc = now;
        RejectionReason = null;
        Version += 1;
        UpdatedAt = now;
    }

    public void Reject(string reason, int callerUserId, DateTime now)
    {
        Status = GateStatus.Rejected;
        ApproverUserId = callerUserId;
        ApprovedAtUtc = null;
        RejectionReason = reason;
        Version += 1;
        UpdatedAt = now;
    }

    public void ResetToWaiting(DateTime now)
    {
        Status = GateStatus.Waiting;
        ApproverUserId = 0;
        ApprovedAtUtc = null;
        RejectionReason = null;
        RequestedAtUtc = now;
        Version += 1;
        UpdatedAt = now;
    }

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
    }
}
