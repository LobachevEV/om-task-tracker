// PerRequestSame: proves the per-request-capture invariant — within one DI scope,
// IRequestClock captures "now" once and returns the same DateTime for every read,
// even if the wall clock advances between reads; a fresh scope captures afresh.
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Api.Time;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Time;

public sealed class RequestClockScopeIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public RequestClockScopeIntegrationTests(ApiWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public void IRequestClock_ReturnsSameValue_AcrossTwoReadsInOneScope()
    {
        var fakeTime = new FakeTimeProvider(new DateTimeOffset(2026, 4, 29, 12, 0, 0, TimeSpan.Zero));
        using var factoryWithFake = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddSingleton<TimeProvider>(fakeTime);
            });
        });

        _ = factoryWithFake.Server;

        using var scope = factoryWithFake.Services.CreateScope();
        var clock = scope.ServiceProvider.GetRequiredService<IRequestClock>();

        var first = clock.GetUtcNow();
        fakeTime.Advance(TimeSpan.FromMinutes(5));
        var second = clock.GetUtcNow();

        first.Kind.Should().Be(DateTimeKind.Utc);
        second.Should().Be(first);
    }

    [Fact]
    public void IRequestClock_ReturnsAdvancedValue_InAFreshScope()
    {
        var fakeTime = new FakeTimeProvider(new DateTimeOffset(2026, 4, 29, 12, 0, 0, TimeSpan.Zero));
        using var factoryWithFake = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddSingleton<TimeProvider>(fakeTime);
            });
        });
        _ = factoryWithFake.Server;

        DateTime firstScopeReading;
        using (var firstScope = factoryWithFake.Services.CreateScope())
        {
            firstScopeReading = firstScope.ServiceProvider.GetRequiredService<IRequestClock>().GetUtcNow();
        }

        fakeTime.Advance(TimeSpan.FromMinutes(7));

        DateTime secondScopeReading;
        using (var secondScope = factoryWithFake.Services.CreateScope())
        {
            secondScopeReading = secondScope.ServiceProvider.GetRequiredService<IRequestClock>().GetUtcNow();
        }

        secondScopeReading.Should().NotBe(firstScopeReading);
        secondScopeReading.Should().Be(firstScopeReading.AddMinutes(7));
    }
}
