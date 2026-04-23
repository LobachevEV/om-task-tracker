using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Features.Features.Data;

public static class DevFeatureSeeder
{
    // IDs mirror the insert order in OneMoreTaskTracker.Users/Data/DevDataSeeder.cs:
    // manager(1), alice.frontend(2), bob.frontend(3), charlie.backend(4), dave.backend(5), eve.qa(6).
    public const int SeededManagerUserId = 1;

    private const int AliceFrontendUserId  = 2;
    private const int CharlieBackendUserId = 4;

    private static readonly SeedFeature[] Features =
    [
        new(
            Title:        "Checkout redesign",
            Description:  "Ship the new multi-step checkout flow end to end.",
            State:        FeatureState.Development,
            PlannedStart: new DateOnly(2026, 04, 01),
            PlannedEnd:   new DateOnly(2026, 06, 15),
            LeadUserId:   AliceFrontendUserId),
        new(
            Title:        "Search infra upgrade",
            Description:  "Move full-text search to the new backend cluster.",
            State:        FeatureState.CsApproving,
            PlannedStart: new DateOnly(2026, 05, 01),
            PlannedEnd:   new DateOnly(2026, 07, 31),
            LeadUserId:   CharlieBackendUserId),
        new(
            Title:        "Legacy API sunset",
            Description:  "Retire v1 REST endpoints and migrate remaining callers.",
            State:        FeatureState.LiveRelease,
            PlannedStart: new DateOnly(2026, 01, 15),
            PlannedEnd:   new DateOnly(2026, 03, 30),
            LeadUserId:   SeededManagerUserId),
    ];

    public static async Task SeedAsync(FeaturesDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (await dbContext.Features.AnyAsync(f => f.ManagerUserId == SeededManagerUserId, cancellationToken))
            return;

        var now = DateTime.UtcNow;

        foreach (var f in Features)
        {
            dbContext.Features.Add(new Feature
            {
                Title         = f.Title,
                Description   = f.Description,
                State         = (int)f.State,
                PlannedStart  = f.PlannedStart,
                PlannedEnd    = f.PlannedEnd,
                LeadUserId    = f.LeadUserId,
                ManagerUserId = SeededManagerUserId,
                CreatedAt     = now,
                UpdatedAt     = now,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private readonly record struct SeedFeature(
        string Title,
        string Description,
        FeatureState State,
        DateOnly PlannedStart,
        DateOnly PlannedEnd,
        int LeadUserId);
}
