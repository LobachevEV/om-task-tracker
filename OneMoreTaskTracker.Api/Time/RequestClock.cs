namespace OneMoreTaskTracker.Api.Time;

public sealed class RequestClock(TimeProvider timeProvider) : IRequestClock
{
    private DateTime? _capturedNow;

    public DateTime GetUtcNow() => _capturedNow ??= timeProvider.GetUtcNow().UtcDateTime;
}
