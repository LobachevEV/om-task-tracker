using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
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
        };
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

    [Fact]
    public async Task SaveChanges_WithMultipleNewFeaturesInOneSave_DoesNotCollideOnZeroId()
    {
        await using var ctx = TestFeaturesDbContext.NewInMemory();

        ctx.Features.Add(new Feature { Title = "first",  LeadUserId = 1, ManagerUserId = 1 });
        ctx.Features.Add(new Feature { Title = "second", LeadUserId = 1, ManagerUserId = 1 });

        var act = async () => await ctx.SaveChangesAsync();

        await act.Should().NotThrowAsync();
        (await ctx.Features.CountAsync()).Should().Be(2);
    }
}
