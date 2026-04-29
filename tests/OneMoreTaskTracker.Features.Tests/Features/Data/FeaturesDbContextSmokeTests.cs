using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Data;

public sealed class FeaturesDbContextSmokeTests
{
    [Fact]
    public void CanInstantiateContext_AndAddFeature_OnInMemoryProvider()
    {
        var options = new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var ctx = new FeaturesDbContext(options);

        var feature = new Feature
        {
            Title = "Smoke test feature",
            LeadUserId = 1,
            ManagerUserId = 2,
            CreatedAt = DateTime.UtcNow,
        };
        feature.Touch(DateTime.UtcNow);
        ctx.Features.Add(feature);
        ctx.SaveChanges();

        ctx.Features.Should().ContainSingle()
            .Which.Title.Should().Be("Smoke test feature");
    }

    [Fact]
    public void NewFeature_DefaultsToCsApprovingState()
    {
        var feature = new Feature { Title = "t" };
        feature.State.Should().Be((int)FeatureState.CsApproving);
    }
}
