using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class DevFeatureSeederTests
{
    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static DevFeatureSeeder NewSeeder() => new(TestRequestClock.System());

    [Fact]
    public async Task SeedAsync_OnEmptyDb_InsertsSeedFeaturesForSeededManager()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var features = await db.Features.AsNoTracking().ToListAsync();
        features.Should().NotBeEmpty();
        features.Should().OnlyContain(f => f.ManagerUserId == DevFeatureSeeder.SeededManagerUserId);
        features.Select(f => f.Title).Should().Contain(new[]
        {
            "Checkout redesign",
            "Search infra upgrade",
            "Legacy API sunset",
        });
    }

    [Fact]
    public async Task SeedAsync_RunTwice_IsIdempotent()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);
        var countAfterFirst = await db.Features.CountAsync();

        await NewSeeder().SeedAsync(db);
        var countAfterSecond = await db.Features.CountAsync();

        countAfterSecond.Should().Be(countAfterFirst);
    }

    [Fact]
    public async Task SeedAsync_WhenSeededManagerAlreadyHasFeatures_DoesNotInsertAnything()
    {
        await using var db = NewDb();
        var preExisting = new Feature
        {
            Title         = "Pre-existing",
            ManagerUserId = DevFeatureSeeder.SeededManagerUserId,
            LeadUserId    = DevFeatureSeeder.SeededManagerUserId,
            CreatedAt     = DateTime.UtcNow,
        };
        preExisting.Touch(DateTime.UtcNow);
        db.Features.Add(preExisting);
        await db.SaveChangesAsync();

        await NewSeeder().SeedAsync(db);

        var titles = await db.Features.AsNoTracking().Select(f => f.Title).ToListAsync();
        titles.Should().ContainSingle().Which.Should().Be("Pre-existing");
    }

    [Fact]
    public async Task SeedAsync_PopulatesStateAndPlannedDates()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        // Legacy Feature.PlannedStart/End is derived from the stage plans (min/max
        // of populated dates). Empty seed feature ("Legacy API sunset") has all
        // null stage dates → both feature dates null. Constrain the assertion to
        // features that have any populated stage plans.
        var features = await db.Features.AsNoTracking().ToListAsync();
        features.Select(f => f.State).Distinct().Should().HaveCountGreaterThan(1, "seed should exercise multiple lifecycle states");

        var scheduled = features.Where(f => f.PlannedStart != null).ToList();
        scheduled.Should().OnlyContain(f => f.PlannedEnd != null && f.PlannedEnd >= f.PlannedStart);
    }

    [Fact]
    public async Task SeedAsync_MaterializesFiveStagePlansPerFeature()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var features = await db.Features.AsNoTracking().Include(f => f.StagePlans).ToListAsync();
        features.Should().OnlyContain(f => f.StagePlans.Count == 5);
        foreach (var feature in features)
        {
            feature.StagePlans.Select(sp => sp.Stage).Distinct().Should().HaveCount(5);
        }
    }

    [Fact]
    public async Task SeedAsync_IncludesFullyPartiallyAndEmptyVariants()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var features = await db.Features.AsNoTracking().Include(f => f.StagePlans).ToListAsync();

        var fully  = features.Single(f => f.Title == "Checkout redesign");
        var partial = features.Single(f => f.Title == "Search infra upgrade");
        var empty  = features.Single(f => f.Title == "Legacy API sunset");

        fully.StagePlans.Should().OnlyContain(sp => sp.PlannedStart != null && sp.PlannedEnd != null);
        partial.StagePlans.Count(sp => sp.PlannedStart != null).Should().Be(2);
        empty.StagePlans.Should().OnlyContain(sp => sp.PlannedStart == null && sp.PlannedEnd == null);
        empty.PlannedStart.Should().BeNull();
        empty.PlannedEnd.Should().BeNull();
    }
}
