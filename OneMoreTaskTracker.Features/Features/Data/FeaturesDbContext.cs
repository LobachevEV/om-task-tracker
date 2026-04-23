using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Features.Features.Data;

public class FeaturesDbContext(DbContextOptions<FeaturesDbContext> options) : DbContext(options)
{
    public DbSet<Feature> Features { get; set; }
    public DbSet<FeatureStagePlan> FeatureStagePlans { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("features");

        modelBuilder.Entity<Feature>(e =>
        {
            e.Property(f => f.Title).HasMaxLength(200);
            e.Property(f => f.Description).HasMaxLength(4000);
            e.HasIndex(f => f.ManagerUserId);
            e.HasIndex(f => f.LeadUserId);
            e.HasIndex(f => f.State);

            // In-schema FK only — cascade-delete removes the 5 stage-plan rows
            // when their owning feature is deleted. No cross-schema FK.
            e.HasMany(f => f.StagePlans)
                .WithOne()
                .HasForeignKey(sp => sp.FeatureId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FeatureStagePlan>(e =>
        {
            // Composite unique index enforces the "at most one row per
            // (feature, stage)" invariant at the DB layer. Upsert logic in
            // StagePlanUpserter relies on this to detect drift.
            e.HasIndex(sp => new { sp.FeatureId, sp.Stage }).IsUnique();

            // Soft cross-service FK; indexed for stale-performer audit queries.
            e.HasIndex(sp => sp.PerformerUserId);
        });
    }
}
