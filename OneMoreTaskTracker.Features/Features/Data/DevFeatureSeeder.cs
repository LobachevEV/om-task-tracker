using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Features.Features.Data;

public sealed class DevFeatureSeeder(IRequestClock clock)
{
    public const int SeededManagerUserId = 1;

    private const int AliceFrontendUserId  = 2;
    private const int CharlieBackendUserId = 4;
    private const int EveQaUserId          = 6;

    private static readonly SeedFeature[] Features =
    [
        new(
            Title:        "Checkout redesign",
            Description:  "Ship the new multi-step checkout flow end to end.",
            State:        FeatureState.Development,
            LeadUserId:   AliceFrontendUserId,
            PlannedStart: new DateOnly(2026, 04, 01),
            PlannedEnd:   new DateOnly(2026, 06, 15)),
        new(
            Title:        "Search infra upgrade",
            Description:  "Move full-text search to the new backend cluster.",
            State:        FeatureState.CsApproving,
            LeadUserId:   CharlieBackendUserId,
            PlannedStart: new DateOnly(2026, 05, 01),
            PlannedEnd:   new DateOnly(2026, 07, 15)),
        new(
            Title:        "Legacy API sunset",
            Description:  "Retire v1 REST endpoints and migrate remaining callers.",
            State:        FeatureState.LiveRelease,
            LeadUserId:   SeededManagerUserId,
            PlannedStart: null,
            PlannedEnd:   null),
        new(
            Title:        "QA hardening pass",
            Description:  "Tighten regression coverage across the platform.",
            State:        FeatureState.Testing,
            LeadUserId:   EveQaUserId,
            PlannedStart: new DateOnly(2026, 06, 01),
            PlannedEnd:   new DateOnly(2026, 06, 30)),
    ];

    public async Task SeedAsync(FeaturesDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (await dbContext.Features.AnyAsync(f => f.ManagerUserId == SeededManagerUserId, cancellationToken))
            return;

        var now = clock.GetUtcNow();

        foreach (var f in Features)
        {
            var feature = new Feature
            {
                Title         = f.Title,
                Description   = f.Description,
                State         = (int)f.State,
                PlannedStart  = f.PlannedStart,
                PlannedEnd    = f.PlannedEnd,
                LeadUserId    = f.LeadUserId,
                ManagerUserId = SeededManagerUserId,
                CreatedAt     = now,
            };
            feature.Touch(now);

            FeatureStageLayout.Materialize(feature, now);

            dbContext.Features.Add(feature);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private readonly record struct SeedFeature(
        string Title,
        string Description,
        FeatureState State,
        int LeadUserId,
        DateOnly? PlannedStart,
        DateOnly? PlannedEnd);
}
