namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class InvalidGateStatusException(string status)
    : Exception($"status must be approved|rejected|waiting (got: {status})")
{
    public string Status { get; } = status;
}
