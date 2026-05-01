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
            "QA hardening pass",
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

        var features = await db.Features.AsNoTracking().ToListAsync();
        features.Select(f => f.State).Distinct().Should().HaveCountGreaterThan(1, "seed should exercise multiple lifecycle states");

        var scheduled = features.Where(f => f.PlannedStart != null).ToList();
        scheduled.Should().OnlyContain(f => f.PlannedEnd != null && f.PlannedEnd >= f.PlannedStart);
    }

    [Fact]
    public async Task SeedAsync_MaterializesThreeGatesAndEightSubStagesPerFeature()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var features = await db.Features
            .AsNoTracking()
            .Include(f => f.Gates)
            .Include(f => f.SubStages)
            .ToListAsync();

        features.Should().OnlyContain(f => f.Gates.Count == 3);
        features.Should().OnlyContain(f => f.SubStages.Count == FeatureStageLayout.AllTracks.Length * FeatureStageLayout.AllPhases.Length);

        foreach (var feature in features)
        {
            feature.Gates.Select(g => g.GateKey).Should().BeEquivalentTo(new[]
            {
                FeatureStageLayout.SpecGateKey,
                FeatureStageLayout.BackendPrepGateKey,
                FeatureStageLayout.FrontendPrepGateKey,
            });

            foreach (var track in FeatureStageLayout.AllTracks)
            {
                foreach (var phase in FeatureStageLayout.AllPhases)
                {
                    var slice = feature.SubStages.Where(s => s.Track == track && s.PhaseKind == phase).ToList();
                    slice.Should().ContainSingle();
                    slice[0].Ordinal.Should().Be(1);
                }
            }
        }
    }
}
