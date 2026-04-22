using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.List;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class ListFeaturesHandlerTests
{
    public ListFeaturesHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Feature NewFeature(string title, int manager, DateOnly? start = null, DateOnly? end = null) =>
        new()
        {
            Title         = title,
            ManagerUserId = manager,
            LeadUserId    = manager,
            PlannedStart  = start,
            PlannedEnd    = end,
        };

    [Fact]
    public async Task List_EmptyDb_ReturnsEmptyCollection()
    {
        var handler = new ListFeaturesHandler(NewDb());

        var response = await handler.List(new ListFeaturesRequest(), TestServerCallContext.Create());

        response.Features.Should().BeEmpty();
    }

    [Fact]
    public async Task List_ThreeFeatures_OrderedByPlannedStartNullsLastThenId()
    {
        var db = NewDb();
        db.Features.Add(NewFeature("Unscheduled", 1));
        db.Features.Add(NewFeature("Early",       1, new DateOnly(2026, 5, 1),  new DateOnly(2026, 5, 10)));
        db.Features.Add(NewFeature("Later",       1, new DateOnly(2026, 6, 1),  new DateOnly(2026, 6, 10)));
        await db.SaveChangesAsync();

        var handler = new ListFeaturesHandler(db);
        var response = await handler.List(new ListFeaturesRequest(), TestServerCallContext.Create());

        response.Features.Select(f => f.Title).Should().ContainInOrder("Early", "Later", "Unscheduled");
    }

    [Fact]
    public async Task List_FilterByManagerUserId_ReturnsOnlyThatManagersFeatures()
    {
        var db = NewDb();
        db.Features.Add(NewFeature("A", 1));
        db.Features.Add(NewFeature("B", 2));
        db.Features.Add(NewFeature("C", 2));
        await db.SaveChangesAsync();

        var handler = new ListFeaturesHandler(db);
        var response = await handler.List(
            new ListFeaturesRequest { ManagerUserId = 2 },
            TestServerCallContext.Create());

        response.Features.Should().HaveCount(2);
        response.Features.Should().OnlyContain(f => f.ManagerUserId == 2);
    }

    [Fact]
    public async Task List_WindowSlice_ReturnsIntersectingAndUnscheduled()
    {
        var db = NewDb();
        db.Features.Add(NewFeature("Unscheduled", 1));
        db.Features.Add(NewFeature("BeforeWindow", 1, new DateOnly(2026, 4, 1),  new DateOnly(2026, 4, 20))); // ends before 2026-05-01
        db.Features.Add(NewFeature("OverlapsStart", 1, new DateOnly(2026, 4, 25), new DateOnly(2026, 5, 5))); // ends inside window
        db.Features.Add(NewFeature("Inside",       1, new DateOnly(2026, 5, 5),  new DateOnly(2026, 5, 10)));
        db.Features.Add(NewFeature("StartsAtEnd",  1, new DateOnly(2026, 5, 15), new DateOnly(2026, 5, 20))); // start == window_end → excluded (exclusive)
        await db.SaveChangesAsync();

        var handler = new ListFeaturesHandler(db);
        var response = await handler.List(
            new ListFeaturesRequest
            {
                WindowStart = "2026-05-01",
                WindowEnd   = "2026-05-15",
            },
            TestServerCallContext.Create());

        response.Features.Select(f => f.Title).Should().BeEquivalentTo(
            new[] { "Unscheduled", "OverlapsStart", "Inside" });
    }

    [Fact]
    public async Task List_InvalidWindowStart_ThrowsInvalidArgument()
    {
        var handler = new ListFeaturesHandler(NewDb());

        var act = () => handler.List(
            new ListFeaturesRequest { WindowStart = "not-a-date" },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task List_AsNoTracking_LeavesChangeTrackerEmpty()
    {
        var db = NewDb();
        db.Features.Add(NewFeature("A", 1, new DateOnly(2026, 5, 1), new DateOnly(2026, 5, 2)));
        await db.SaveChangesAsync();
        // Clear tracker from the SaveChanges above so we only observe the handler's tracking footprint.
        db.ChangeTracker.Clear();

        var handler = new ListFeaturesHandler(db);
        _ = await handler.List(new ListFeaturesRequest(), TestServerCallContext.Create());

        db.ChangeTracker.Entries<Feature>().Should().BeEmpty();
    }
}
