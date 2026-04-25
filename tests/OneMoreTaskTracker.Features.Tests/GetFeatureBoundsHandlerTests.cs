using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Bounds;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.GetFeatureBoundsQuery;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class GetFeatureBoundsHandlerTests
{
    public GetFeatureBoundsHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Feature NewFeature(int manager, DateOnly? start = null, DateOnly? end = null) =>
        new()
        {
            Title         = "F",
            ManagerUserId = manager,
            LeadUserId    = manager,
            PlannedStart  = start,
            PlannedEnd    = end,
        };

    [Fact]
    public async Task Get_EmptyDb_ReturnsEmptyStrings()
    {
        var handler = new GetFeatureBoundsHandler(NewDb());

        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().BeEmpty();
        response.LatestPlannedEnd.Should().BeEmpty();
    }

    [Fact]
    public async Task Get_ManagerUserIdZero_ShortCircuitsToEmptyStrings()
    {
        var db = NewDb();
        db.Features.Add(NewFeature(1, new DateOnly(2026, 5, 1), new DateOnly(2026, 5, 10)));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 0 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().BeEmpty();
        response.LatestPlannedEnd.Should().BeEmpty();
    }

    [Fact]
    public async Task Get_ReturnsMinPlannedStartAndMaxPlannedEnd_ForManager()
    {
        var db = NewDb();
        db.Features.Add(NewFeature(1, new DateOnly(2026, 5, 1),  new DateOnly(2026, 5, 10)));
        db.Features.Add(NewFeature(1, new DateOnly(2026, 6, 1),  new DateOnly(2026, 6, 30)));
        db.Features.Add(NewFeature(1, new DateOnly(2026, 4, 15), new DateOnly(2026, 4, 30)));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().Be("2026-04-15");
        response.LatestPlannedEnd.Should().Be("2026-06-30");
    }

    [Fact]
    public async Task Get_IsolatesPerManager()
    {
        var db = NewDb();
        db.Features.Add(NewFeature(1, new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31)));
        db.Features.Add(NewFeature(2, new DateOnly(2026, 5, 1), new DateOnly(2026, 5, 31)));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 2 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().Be("2026-05-01");
        response.LatestPlannedEnd.Should().Be("2026-05-31");
    }

    [Fact]
    public async Task Get_NullDates_AreIgnored()
    {
        var db = NewDb();
        db.Features.Add(NewFeature(1));
        db.Features.Add(NewFeature(1, new DateOnly(2026, 5, 1), null));
        db.Features.Add(NewFeature(1, null, new DateOnly(2026, 5, 20)));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().Be("2026-05-01");
        response.LatestPlannedEnd.Should().Be("2026-05-20");
    }

    [Fact]
    public async Task Get_AllNullDates_ReturnsEmptyStrings()
    {
        var db = NewDb();
        db.Features.Add(NewFeature(1));
        db.Features.Add(NewFeature(1));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().BeEmpty();
        response.LatestPlannedEnd.Should().BeEmpty();
    }
}
