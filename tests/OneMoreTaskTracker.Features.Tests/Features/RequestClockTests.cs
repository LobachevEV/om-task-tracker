using FluentAssertions;
using Microsoft.Extensions.Time.Testing;
using OneMoreTaskTracker.Features.Features.Data;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features;

public sealed class RequestClockTests
{
    [Fact]
    public void GetUtcNow_ReturnsSameValue_WhenCalledTwiceOnSameInstance()
    {
        var fakeTime = new FakeTimeProvider(new DateTimeOffset(2026, 4, 29, 12, 0, 0, TimeSpan.Zero));
        var clock = new RequestClock(fakeTime);

        var first = clock.GetUtcNow();
        fakeTime.Advance(TimeSpan.FromMinutes(5));
        var second = clock.GetUtcNow();

        first.Kind.Should().Be(DateTimeKind.Utc);
        second.Should().Be(first);
    }

    [Fact]
    public void GetUtcNow_ReturnsDifferentValues_AcrossDistinctInstances_WhenTimeAdvances()
    {
        var fakeTime = new FakeTimeProvider(new DateTimeOffset(2026, 4, 29, 12, 0, 0, TimeSpan.Zero));
        var firstScopeClock = new RequestClock(fakeTime);
        var firstReading = firstScopeClock.GetUtcNow();

        fakeTime.Advance(TimeSpan.FromMinutes(7));
        var secondScopeClock = new RequestClock(fakeTime);
        var secondReading = secondScopeClock.GetUtcNow();

        secondReading.Should().NotBe(firstReading);
        secondReading.Should().Be(firstReading.AddMinutes(7));
    }
}
