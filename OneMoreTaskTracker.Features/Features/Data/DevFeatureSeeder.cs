using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Features.Features.Data;

public static class DevFeatureSeeder
{
    // IDs mirror the insert order in OneMoreTaskTracker.Users/Data/DevDataSeeder.cs:
    // manager(1), alice.frontend(2), bob.frontend(3), charlie.backend(4), dave.backend(5), eve.qa(6).
    public const int SeededManagerUserId = 1;

    private const int AliceFrontendUserId  = 2;
    private const int BobFrontendUserId    = 3;
    private const int CharlieBackendUserId = 4;
    private const int DaveBackendUserId    = 5;
    private const int EveQaUserId          = 6;

    // Exactly three fixture variants exercise the three stage-plan states the
    // FE needs to render on day one (backend-plan.md § Seed / Fixture Data):
    //   A — fully planned (all 5 stages populated with dates + performers)
    //   B — partially planned (first 2 stages populated)
    //   C — empty (all 5 rows present, all dates null, performer = 0)
    // Derived Feature.PlannedStart/PlannedEnd are computed from the stage dates
    // so seeded rows exercise the same derivation logic as the Update handler.
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
    ];

    public static async Task SeedAsync(FeaturesDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (await dbContext.Features.AnyAsync(f => f.ManagerUserId == SeededManagerUserId, cancellationToken))
            return;

        var now = DateTime.UtcNow;

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
                PlannedStart  = populatedStarts.Count > 0 ? populatedStarts.Min() : null,
                PlannedEnd    = populatedEnds.Count   > 0 ? populatedEnds.Max()   : null,
                LeadUserId    = f.LeadUserId,
                ManagerUserId = SeededManagerUserId,
                CreatedAt     = now,
                UpdatedAt     = now,
            };

            foreach (var sp in f.StagePlans)
            {
                feature.StagePlans.Add(new FeatureStagePlan
                {
                    Stage           = (int)sp.Stage,
                    PlannedStart    = sp.PlannedStart,
                    PlannedEnd      = sp.PlannedEnd,
                    PerformerUserId = sp.PerformerUserId,
                    CreatedAt       = now,
                    UpdatedAt       = now,
                });
            }

            dbContext.Features.Add(feature);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private readonly record struct SeedFeature(
        string Title,
        string Description,
        FeatureState State,
        int LeadUserId,
        SeedStagePlan[] StagePlans);

    private readonly record struct SeedStagePlan(
        FeatureState Stage,
        DateOnly? PlannedStart,
        DateOnly? PlannedEnd,
        int PerformerUserId);
}
