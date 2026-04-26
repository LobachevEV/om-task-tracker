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

    private static Feature NewFeatureWithStages(int manager, params (DateOnly?, DateOnly?)[] stages)
    {
        var feature = new Feature
        {
            Title         = "F",
            ManagerUserId = manager,
            LeadUserId    = manager,
        };
        var ord = 0;
        foreach (var (s, e) in stages)
        {
            feature.StagePlans.Add(new FeatureStagePlan
            {
                Stage        = ord++,
                PlannedStart = s,
                PlannedEnd   = e,
            });
        }
        return feature;
    }

    private static Feature NewFeatureWithLegacyDatesOnly(int manager, DateOnly? start, DateOnly? end) =>
        new()
        {
            Title         = "Legacy",
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
        db.Features.Add(NewFeatureWithStages(1,
            (new DateOnly(2026, 5, 1), new DateOnly(2026, 5, 10))));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 0 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().BeEmpty();
        response.LatestPlannedEnd.Should().BeEmpty();
    }

    [Fact]
    public async Task Get_ReturnsMinPlannedStartAndMaxPlannedEnd_AcrossStages()
    {
        var db = NewDb();
        db.Features.Add(NewFeatureWithStages(1,
            (new DateOnly(2026, 5, 1),  new DateOnly(2026, 5, 10)),
            (new DateOnly(2026, 5, 11), new DateOnly(2026, 5, 20))));
        db.Features.Add(NewFeatureWithStages(1,
            (new DateOnly(2026, 6, 1),  new DateOnly(2026, 6, 30))));
        db.Features.Add(NewFeatureWithStages(1,
            (new DateOnly(2026, 4, 15), new DateOnly(2026, 4, 30))));
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
        db.Features.Add(NewFeatureWithStages(1,
            (new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31))));
        db.Features.Add(NewFeatureWithStages(2,
            (new DateOnly(2026, 5, 1), new DateOnly(2026, 5, 31))));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 2 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().Be("2026-05-01");
        response.LatestPlannedEnd.Should().Be("2026-05-31");
    }

    [Fact]
    public async Task Get_NullStageDates_AreIgnored()
    {
        var db = NewDb();
        db.Features.Add(NewFeatureWithStages(1, (null, null)));
        db.Features.Add(NewFeatureWithStages(1, (new DateOnly(2026, 5, 1), null)));
        db.Features.Add(NewFeatureWithStages(1, (null, new DateOnly(2026, 5, 20))));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().Be("2026-05-01");
        response.LatestPlannedEnd.Should().Be("2026-05-20");
    }

    [Fact]
    public async Task Get_AllNullStageDates_ReturnsEmptyStrings()
    {
        var db = NewDb();
        db.Features.Add(NewFeatureWithStages(1, (null, null)));
        db.Features.Add(NewFeatureWithStages(1, (null, null)));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().BeEmpty();
        response.LatestPlannedEnd.Should().BeEmpty();
    }

    [Fact]
    public async Task Get_FeatureWithLegacyFeatureLevelDatesAndNoStages_ReturnsEmpty()
    {
        var db = NewDb();
        db.Features.Add(NewFeatureWithLegacyDatesOnly(
            manager: 1,
            start:   new DateOnly(2025, 1, 1),
            end:     new DateOnly(2025, 12, 31)));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().BeEmpty();
        response.LatestPlannedEnd.Should().BeEmpty();
    }

    [Fact]
    public async Task Get_MixesPlannedFeatureWithUnplannedLegacyFeature_OnlyStageDatesContribute()
    {
        var db = NewDb();
        db.Features.Add(NewFeatureWithStages(1,
            (new DateOnly(2026, 5, 1), new DateOnly(2026, 5, 31))));
        db.Features.Add(NewFeatureWithLegacyDatesOnly(
            manager: 1,
            start:   new DateOnly(2020, 1, 1),
            end:     new DateOnly(2030, 12, 31)));
        await db.SaveChangesAsync();

        var handler = new GetFeatureBoundsHandler(db);
        var response = await handler.Get(
            new GetFeatureBoundsRequest { ManagerUserId = 1 },
            TestServerCallContext.Create());

        response.EarliestPlannedStart.Should().Be("2026-05-01");
        response.LatestPlannedEnd.Should().Be("2026-05-31");
    }
}
