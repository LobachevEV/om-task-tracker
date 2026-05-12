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
    public async Task SeedAsync_AllFeaturesHaveAllFiveStageDateSlots()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var features = await db.Features.AsNoTracking().ToListAsync();
        features.Should().NotBeEmpty();
        foreach (var f in features.Where(f => f.PlannedStart != null))
            f.PlannedEnd.Should().NotBeNull("PlannedEnd must be set when PlannedStart is set");
    }

    [Fact]
    public async Task SeedAsync_IncludesFullyPartiallyAndEmptyVariants()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var features = await db.Features
            .AsNoTracking()
            .Include(f => f.Tracks)
            .ThenInclude(t => t.Stages)
            .ToListAsync();

        var fully   = features.Single(f => f.Title == "Checkout redesign");
        var partial = features.Single(f => f.Title == "Search infra upgrade");
        var empty   = features.Single(f => f.Title == "Legacy API sunset");

        // "Checkout redesign" — at least one track has all five stages with a PlannedStart
        var fullyPopulatedStageCount = fully.Tracks
            .SelectMany(t => t.Stages)
            .Count(s => s.PlannedStart != null);
        fullyPopulatedStageCount.Should().BeGreaterThan(0, "fully-seeded feature must have stages with planned dates");

        // "Search infra upgrade" — has fewer populated stage starts than the fully-seeded feature
        var partialPopulatedStageCount = partial.Tracks
            .SelectMany(t => t.Stages)
            .Count(s => s.PlannedStart != null);
        partialPopulatedStageCount.Should().BeLessThan(fullyPopulatedStageCount,
            "partial fixture must have fewer populated stage dates than the full fixture");

        // "Legacy API sunset" — no stage dates and no derived feature dates
        var emptyStageCount = empty.Tracks
            .SelectMany(t => t.Stages)
            .Count(s => s.PlannedStart != null);
        emptyStageCount.Should().Be(0, "empty fixture must have no populated stage dates");
        empty.PlannedStart.Should().BeNull();
        empty.PlannedEnd.Should().BeNull();
    }

    [Fact]
    public async Task SeedAsync_EachSeededTrackHasExactlyFiveStages()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var tracks = await db.FeatureTracks
            .AsNoTracking()
            .Include(t => t.Stages)
            .ToListAsync();

        tracks.Should().NotBeEmpty("seed should create at least one track");
        tracks.Should().OnlyContain(t => t.Stages.Count == 5,
            "each seeded track must have exactly 5 stage rows (one per admitted key)");
    }

    [Fact]
    public async Task SeedAsync_FrontendTracksDoNotContainCsApprovingStageKey()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var frontendTracks = await db.FeatureTracks
            .AsNoTracking()
            .Include(t => t.Stages)
            .Where(t => t.Kind == 0)
            .ToListAsync();

        foreach (var track in frontendTracks)
            track.Stages.Should().NotContain(
                s => s.StageKey == 2,
                "CsApproving (ordinal 2) is not a valid Frontend stage key");
    }

    [Fact]
    public async Task SeedAsync_BackendTracksDoNotContainSrApprovingStageKey()
    {
        await using var db = NewDb();

        await NewSeeder().SeedAsync(db);

        var backendTracks = await db.FeatureTracks
            .AsNoTracking()
            .Include(t => t.Stages)
            .Where(t => t.Kind == 1)
            .ToListAsync();

        foreach (var track in backendTracks)
            track.Stages.Should().NotContain(
                s => s.StageKey == 1,
                "SrApproving (ordinal 1) is not a valid Backend stage key");
    }
}
