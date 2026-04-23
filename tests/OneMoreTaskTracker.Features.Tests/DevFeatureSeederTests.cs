using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class DevFeatureSeederTests
{
    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task SeedAsync_OnEmptyDb_InsertsSeedFeaturesForSeededManager()
    {
        await using var db = NewDb();

        await DevFeatureSeeder.SeedAsync(db);

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

        await DevFeatureSeeder.SeedAsync(db);
        var countAfterFirst = await db.Features.CountAsync();

        await DevFeatureSeeder.SeedAsync(db);
        var countAfterSecond = await db.Features.CountAsync();

        countAfterSecond.Should().Be(countAfterFirst);
    }

    [Fact]
    public async Task SeedAsync_WhenSeededManagerAlreadyHasFeatures_DoesNotInsertAnything()
    {
        await using var db = NewDb();
        db.Features.Add(new Feature
        {
            Title         = "Pre-existing",
            ManagerUserId = DevFeatureSeeder.SeededManagerUserId,
            LeadUserId    = DevFeatureSeeder.SeededManagerUserId,
        });
        await db.SaveChangesAsync();

        await DevFeatureSeeder.SeedAsync(db);

        var titles = await db.Features.AsNoTracking().Select(f => f.Title).ToListAsync();
        titles.Should().ContainSingle().Which.Should().Be("Pre-existing");
    }

    [Fact]
    public async Task SeedAsync_PopulatesStateAndPlannedDates()
    {
        await using var db = NewDb();

        await DevFeatureSeeder.SeedAsync(db);

        var features = await db.Features.AsNoTracking().ToListAsync();
        features.Should().OnlyContain(f => f.PlannedStart != null && f.PlannedEnd != null);
        features.Should().OnlyContain(f => f.PlannedEnd >= f.PlannedStart);
        features.Select(f => f.State).Distinct().Should().HaveCountGreaterThan(1, "seed should exercise multiple lifecycle states");
    }
}
