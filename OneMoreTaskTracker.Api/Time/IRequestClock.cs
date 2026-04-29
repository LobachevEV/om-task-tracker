namespace OneMoreTaskTracker.Api.Time;

public interface IRequestClock
{
    DateTime GetUtcNow();
}
