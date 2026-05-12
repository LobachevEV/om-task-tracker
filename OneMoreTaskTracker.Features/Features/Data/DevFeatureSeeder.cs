using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Features.Features.Data;

public sealed class DevFeatureSeeder(IRequestClock clock)
{
    // IDs mirror the insert order in OneMoreTaskTracker.Users/Data/DevDataSeeder.cs:
    // manager(1), alice.frontend(2), bob.frontend(3), charlie.backend(4), dave.backend(5), eve.qa(6).
    public const int SeededManagerUserId = 1;

    private const int AliceFrontendUserId  = 2;
    private const int CharlieBackendUserId = 4;
    private const int DaveBackendUserId    = 5;

    public async Task SeedAsync(FeaturesDbContext dbContext, CancellationToken cancellationToken = default)
    {
        await SeedFeaturesAsync(dbContext, cancellationToken);
        await SeedTracksAsync(dbContext, cancellationToken);
    }

    private async Task SeedFeaturesAsync(FeaturesDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.Features.AnyAsync(f => f.ManagerUserId == SeededManagerUserId, cancellationToken))
            return;

        var now = clock.GetUtcNow();

        // A — fully planned (all 5 stages populated with dates + performers)
        var checkout = new Feature
        {
            Title         = "Checkout redesign",
            Description   = "Ship the new multi-step checkout flow end to end.",
            State         = (int)FeatureState.Development,
            LeadUserId    = AliceFrontendUserId,
            ManagerUserId = SeededManagerUserId,
            CreatedAt     = now,
        };
        checkout.Touch(now);
        dbContext.Features.Add(checkout);

        // B — partially planned (first 2 stages populated)
        var search = new Feature
        {
            Title         = "Search infra upgrade",
            Description   = "Move full-text search to the new backend cluster.",
            State         = (int)FeatureState.CsApproving,
            LeadUserId    = CharlieBackendUserId,
            ManagerUserId = SeededManagerUserId,
            CreatedAt     = now,
        };
        search.Touch(now);
        dbContext.Features.Add(search);

        // C — empty (no stage dates, no performers)
        var legacy = new Feature
        {
            Title         = "Legacy API sunset",
            Description   = "Retire v1 REST endpoints and migrate remaining callers.",
            State         = (int)FeatureState.LiveRelease,
            LeadUserId    = SeededManagerUserId,
            ManagerUserId = SeededManagerUserId,
            CreatedAt     = now,
        };
        legacy.Touch(now);
        dbContext.Features.Add(legacy);

        // D — legacy drift: no stage dates, but Feature.PlannedStart/PlannedEnd hold extreme
        //     values (simulates the back-compat write path that bypasses stage-derived recompute).
        //     Bounds query MUST ignore this feature; only stages contribute.
        var drift = new Feature
        {
            Title         = "Drift fixture (legacy dates only)",
            Description   = "Feature-level PlannedStart/End set far outside the planned-stage range; no stage dates. Verifies bounds query ignores feature-level legacy values.",
            State         = (int)FeatureState.CsApproving,
            LeadUserId    = SeededManagerUserId,
            ManagerUserId = SeededManagerUserId,
            CreatedAt     = now,
            PlannedStart  = new DateOnly(2020, 01, 01),
            PlannedEnd    = new DateOnly(2030, 12, 31),
        };
        drift.Touch(now);
        dbContext.Features.Add(drift);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedTracksAsync(FeaturesDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.FeatureTracks.AnyAsync(cancellationToken))
            return;

        // Only the first two features get seeded tracks (indices 0 and 1).
        // features[2] and [3] are intentionally left without tracks to exercise
        // the "no tracks" code path in the list and detail responses.
        var seededFeatures = await dbContext.Features
            .Where(f => f.ManagerUserId == SeededManagerUserId)
            .OrderBy(f => f.Id)
            .Take(2)
            .ToListAsync(cancellationToken);

        if (seededFeatures.Count < 2)
            return;

        var now = clock.GetUtcNow();

        // features[0]: FRONTEND (owner=Alice) + BACKEND (owner=Charlie)
        var checkoutFeature = seededFeatures[0];

        var frontendTrack = FeatureTrack.Create(checkoutFeature.Id, (int)FeatureTrackKind.Frontend, AliceFrontendUserId, now);
        dbContext.FeatureTracks.Add(frontendTrack);

        var backendTrack = FeatureTrack.Create(checkoutFeature.Id, (int)FeatureTrackKind.Backend, CharlieBackendUserId, now);
        dbContext.FeatureTracks.Add(backendTrack);

        await dbContext.SaveChangesAsync(cancellationToken);

        // Checkout redesign — fully planned: every admitted stage gets start + end dates.
        // Dates are contiguous two-week windows per stage so PlannedEnd >= PlannedStart always holds.
        var checkoutStageStart = new DateOnly(2026, 5, 1);
        foreach (var stageKey in FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Frontend))
        {
            var stage = FeatureTrackStage.Create(frontendTrack.Id, (int)stageKey, now);
            stage.SetPlannedStart(checkoutStageStart, now);
            stage.SetPlannedEnd(checkoutStageStart.AddDays(13), now);
            checkoutStageStart = checkoutStageStart.AddDays(14);
            dbContext.FeatureTrackStages.Add(stage);
        }

        foreach (var stageKey in FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Backend))
        {
            var stage = FeatureTrackStage.Create(backendTrack.Id, (int)stageKey, now);
            stage.SetPlannedStart(checkoutStageStart, now);
            stage.SetPlannedEnd(checkoutStageStart.AddDays(13), now);
            checkoutStageStart = checkoutStageStart.AddDays(14);
            dbContext.FeatureTrackStages.Add(stage);
        }

        // Recompute Feature.PlannedStart/End from the stage rollup (min start, max end).
        var allCheckoutStages = dbContext.FeatureTrackStages.Local
            .Where(s => s.PlannedStart != null)
            .ToList();
        if (allCheckoutStages.Count > 0)
        {
            checkoutFeature.PlannedStart = allCheckoutStages.Min(s => s.PlannedStart);
            checkoutFeature.PlannedEnd   = allCheckoutStages.Max(s => s.PlannedEnd);
        }

        // features[1]: BACKEND (owner=Dave) — partially planned: only the first backend stage has dates.
        var searchFeature = seededFeatures[1];
        var searchBackendTrack = FeatureTrack.Create(searchFeature.Id, (int)FeatureTrackKind.Backend, DaveBackendUserId, now);
        dbContext.FeatureTracks.Add(searchBackendTrack);

        var searchStageStart = new DateOnly(2026, 6, 1);
        bool firstSearchStage = true;
        foreach (var stageKey in FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Backend))
        {
            var stage = FeatureTrackStage.Create(searchBackendTrack.Id, (int)stageKey, now);
            if (firstSearchStage)
            {
                stage.SetPlannedStart(searchStageStart, now);
                stage.SetPlannedEnd(searchStageStart.AddDays(13), now);
                firstSearchStage = false;
            }
            dbContext.FeatureTrackStages.Add(stage);
        }

        searchFeature.PlannedStart = searchStageStart;
        searchFeature.PlannedEnd   = searchStageStart.AddDays(13);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
