using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OneMoreTaskTracker.Features.Features.Data;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class DbContextRegistrationTests
{
    [Fact]
    public void FeaturesDbContext_ResolvesUnderScopeValidation()
    {
        var services = new ServiceCollection();
        services.AddSingleton<TimeProvider>(TimeProvider.System);
        services.AddSingleton<TrackedEntitySaveChangesInterceptor>();
        services.AddDbContextPool<FeaturesDbContext>((sp, opt) =>
            opt
                .UseInMemoryDatabase($"db-{Guid.NewGuid()}")
                .AddInterceptors(sp.GetRequiredService<TrackedEntitySaveChangesInterceptor>()));

        using var provider = services.BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateScopes = true,
            ValidateOnBuild = true,
        });

        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FeaturesDbContext>();

        db.Should().NotBeNull();
    }
}
