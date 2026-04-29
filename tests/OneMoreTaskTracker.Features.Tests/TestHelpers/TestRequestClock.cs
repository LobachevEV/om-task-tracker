using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Tests.TestHelpers;

internal static class TestRequestClock
{
    public static IRequestClock System() => new RequestClock(TimeProvider.System);
}
