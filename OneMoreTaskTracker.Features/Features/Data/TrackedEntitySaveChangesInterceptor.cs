using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace OneMoreTaskTracker.Features.Features.Data;

public sealed class TrackedEntitySaveChangesInterceptor(IRequestClock clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Apply(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Apply(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    private void Apply(DbContext? context)
    {
        if (context == null) return;
        var now = clock.GetUtcNow();
        var changeTracker = context.ChangeTracker;

        var featuresById = changeTracker.Entries<Feature>()
            .ToDictionary(e => e.Entity.Id);

        var childFeatureIds = new HashSet<int>();
        foreach (var entry in changeTracker.Entries<FeatureGate>().ToList())
            if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
                childFeatureIds.Add(entry.Entity.FeatureId);
        foreach (var entry in changeTracker.Entries<FeatureSubStage>().ToList())
            if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
                childFeatureIds.Add(entry.Entity.FeatureId);

        foreach (var featureId in childFeatureIds)
            if (featuresById.TryGetValue(featureId, out var parent) && parent.State == EntityState.Unchanged)
                parent.State = EntityState.Modified;

        foreach (var entry in changeTracker.Entries<ITrackedEntity>().ToList())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.Version += 1;
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }
    }
}
