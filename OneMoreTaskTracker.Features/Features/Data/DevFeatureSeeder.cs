using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Features;

namespace OneMoreTaskTracker.Features.Features.Data;

public sealed class DevFeatureSeeder(IRequestClock clock)
{
    // IDs mirror the insert order in OneMoreTaskTracker.Users/Data/DevDataSeeder.cs:
    // manager(1), alice.frontend(2), bob.frontend(3), charlie.backend(4), dave.backend(5), eve.qa(6).
    public const int SeededManagerUserId = 1;

    private const int AliceFrontendUserId  = 2;
    private const int BobFrontendUserId    = 3;
    private const int CharlieBackendUserId = 4;
    private const int DaveBackendUserId    = 5;
    private const int EveQaUserId          = 6;

    // Four fixture variants:
    //   A — fully planned (all 5 stages populated with dates + performers)
    //   B — partially planned (first 2 stages populated)
    //   C — empty (all 5 rows present, all dates null, performer = 0)
    //   D — legacy drift: no stage dates, but Feature.PlannedStart/PlannedEnd
    //       hold extreme values (simulates the back-compat write path in
    //       UpdateFeatureHandler that bypasses stage-derived recompute).
    //       Bounds query MUST ignore this feature; only stages contribute.
    // Derived Feature.PlannedStart/PlannedEnd are computed from the stage dates
    // unless LegacyPlannedStart/End override them (variant D).
    private static readonly SeedFeature[] Features =
    [
        new(
            Title:        "Checkout redesign",
            Description:  "Ship the new multi-step checkout flow end to end.",
            State:        FeatureState.Development,
            LeadUserId:   AliceFrontendUserId,
            StagePlans:
            [
                new(FeatureState.CsApproving,    new DateOnly(2026, 04, 01), new DateOnly(2026, 04, 07), SeededManagerUserId),
                new(FeatureState.Development,    new DateOnly(2026, 04, 08), new DateOnly(2026, 05, 15), AliceFrontendUserId),
                new(FeatureState.Testing,        new DateOnly(2026, 05, 16), new DateOnly(2026, 05, 25), EveQaUserId),
                new(FeatureState.EthalonTesting, new DateOnly(2026, 05, 26), new DateOnly(2026, 06, 05), EveQaUserId),
                new(FeatureState.LiveRelease,    new DateOnly(2026, 06, 10), new DateOnly(2026, 06, 15), AliceFrontendUserId),
            ]),
        new(
            Title:        "Search infra upgrade",
            Description:  "Move full-text search to the new backend cluster.",
            State:        FeatureState.CsApproving,
            LeadUserId:   CharlieBackendUserId,
            StagePlans:
            [
                new(FeatureState.CsApproving,    new DateOnly(2026, 05, 01), new DateOnly(2026, 05, 10), SeededManagerUserId),
                new(FeatureState.Development,    new DateOnly(2026, 05, 11), new DateOnly(2026, 07, 15), CharlieBackendUserId),
                new(FeatureState.Testing,        null,                       null,                       0),
                new(FeatureState.EthalonTesting, null,                       null,                       0),
                new(FeatureState.LiveRelease,    null,                       null,                       0),
            ]),
        new(
            Title:        "Legacy API sunset",
            Description:  "Retire v1 REST endpoints and migrate remaining callers.",
            State:        FeatureState.LiveRelease,
            LeadUserId:   SeededManagerUserId,
            StagePlans:
            [
                new(FeatureState.CsApproving,    null, null, 0),
                new(FeatureState.Development,    null, null, 0),
                new(FeatureState.Testing,        null, null, 0),
                new(FeatureState.EthalonTesting, null, null, 0),
                new(FeatureState.LiveRelease,    null, null, 0),
            ]),
        new(
            Title:               "Drift fixture (legacy dates only)",
            Description:         "Feature-level PlannedStart/End set far outside the planned-stage range; no stage dates. Verifies bounds query ignores feature-level legacy values.",
            State:               FeatureState.CsApproving,
            LeadUserId:          SeededManagerUserId,
            StagePlans:
            [
                new(FeatureState.CsApproving,    null, null, 0),
                new(FeatureState.Development,    null, null, 0),
                new(FeatureState.Testing,        null, null, 0),
                new(FeatureState.EthalonTesting, null, null, 0),
                new(FeatureState.LiveRelease,    null, null, 0),
            ],
            LegacyPlannedStart:  new DateOnly(2020, 01, 01),
            LegacyPlannedEnd:    new DateOnly(2030, 12, 31)),
    ];

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

        foreach (var f in Features)
        {
            // Derive feature-level dates from the seeded stage plans so the
            // min/max invariant holds at read time (derivation is recomputed
            // on Update; the seeder matches it at rest).
            var populatedStarts = f.StagePlans.Where(sp => sp.PlannedStart.HasValue).Select(sp => sp.PlannedStart!.Value).ToList();
            var populatedEnds   = f.StagePlans.Where(sp => sp.PlannedEnd.HasValue).Select(sp => sp.PlannedEnd!.Value).ToList();

            var feature = new Feature
            {
                Title         = f.Title,
                Description   = f.Description,
                State         = (int)f.State,
                PlannedStart  = f.LegacyPlannedStart ?? (populatedStarts.Count > 0 ? populatedStarts.Min() : null),
                PlannedEnd    = f.LegacyPlannedEnd   ?? (populatedEnds.Count   > 0 ? populatedEnds.Max()   : null),
                LeadUserId    = f.LeadUserId,
                ManagerUserId = SeededManagerUserId,
                CreatedAt     = now,
            };
            feature.Touch(now);

            foreach (var sp in f.StagePlans)
            {
                var plan = new FeatureStagePlan
                {
                    Stage           = (int)sp.Stage,
                    PlannedStart    = sp.PlannedStart,
                    PlannedEnd      = sp.PlannedEnd,
                    PerformerUserId = sp.PerformerUserId,
                    CreatedAt       = now,
                };
                plan.Touch(now);
                feature.StagePlans.Add(plan);
            }

            dbContext.Features.Add(feature);
        }

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

        foreach (var stageKey in FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Frontend))
        {
            dbContext.FeatureTrackStages.Add(FeatureTrackStage.Create(frontendTrack.Id, (int)stageKey, now));
        }

        foreach (var stageKey in FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Backend))
        {
            dbContext.FeatureTrackStages.Add(FeatureTrackStage.Create(backendTrack.Id, (int)stageKey, now));
        }

        // features[1]: BACKEND (owner=Dave)
        var searchFeature = seededFeatures[1];
        var searchBackendTrack = FeatureTrack.Create(searchFeature.Id, (int)FeatureTrackKind.Backend, DaveBackendUserId, now);
        dbContext.FeatureTracks.Add(searchBackendTrack);

        foreach (var stageKey in FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Backend))
        {
            dbContext.FeatureTrackStages.Add(FeatureTrackStage.Create(searchBackendTrack.Id, (int)stageKey, now));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private readonly record struct SeedFeature(
        string Title,
        string Description,
        FeatureState State,
        int LeadUserId,
        SeedStagePlan[] StagePlans,
        DateOnly? LegacyPlannedStart = null,
        DateOnly? LegacyPlannedEnd   = null);

    private readonly record struct SeedStagePlan(
        FeatureState Stage,
        DateOnly? PlannedStart,
        DateOnly? PlannedEnd,
        int PerformerUserId);
}
