namespace OneMoreTaskTracker.Features.Features.Data;

public sealed class RequestClock(TimeProvider timeProvider) : IRequestClock
{
    private DateTime? _capturedNow;

    public DateTime GetUtcNow() => _capturedNow ??= timeProvider.GetUtcNow().UtcDateTime;
}
