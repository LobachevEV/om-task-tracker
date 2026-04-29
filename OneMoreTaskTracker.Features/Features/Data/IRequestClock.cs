namespace OneMoreTaskTracker.Features.Features.Data;

public interface IRequestClock
{
    DateTime GetUtcNow();
}
