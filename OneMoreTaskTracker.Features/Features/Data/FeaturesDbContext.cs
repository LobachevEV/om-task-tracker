using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Features.Features.Data;

public class FeaturesDbContext(DbContextOptions<FeaturesDbContext> options) : DbContext(options)
{
    public DbSet<Feature> Features { get; set; }
    public DbSet<FeatureTrack> FeatureTracks { get; set; }
    public DbSet<FeatureTrackStage> FeatureTrackStages { get; set; }

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

            e.Property(f => f.Version).IsConcurrencyToken();

            e.HasMany(f => f.Tracks)
                .WithOne()
                .HasForeignKey(t => t.FeatureId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FeatureTrack>(e =>
        {
            e.HasIndex(t => new { t.FeatureId, t.Kind }).IsUnique();

            e.HasIndex(t => t.TrackOwnerUserId);

            e.Property(t => t.Version).IsConcurrencyToken();

            e.HasMany(t => t.Stages)
                .WithOne()
                .HasForeignKey(s => s.FeatureTrackId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FeatureTrackStage>(e =>
        {
            e.HasIndex(s => new { s.FeatureTrackId, s.StageKey }).IsUnique();

            e.HasIndex(s => s.StageOwnerUserId);

            e.Property(s => s.Version).IsConcurrencyToken();
        });
    }
}
