using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Features.Features.Data;

public class FeaturesDbContext(DbContextOptions<FeaturesDbContext> options) : DbContext(options)
{
    public DbSet<Feature> Features { get; set; }
    public DbSet<FeatureGate> FeatureGates { get; set; }
    public DbSet<FeatureSubStage> FeatureSubStages { get; set; }

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

            e.HasMany(f => f.Gates)
                .WithOne()
                .HasForeignKey(g => g.FeatureId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(f => f.SubStages)
                .WithOne()
                .HasForeignKey(s => s.FeatureId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FeatureGate>(e =>
        {
            e.Property(g => g.GateKey).HasMaxLength(32).IsRequired();
            e.Property(g => g.Kind).HasConversion<short>();
            e.Property(g => g.Track).HasConversion<short?>();
            e.Property(g => g.Status).HasConversion<short>();
            e.Property(g => g.RejectionReason).HasMaxLength(500);
            e.HasIndex(g => new { g.FeatureId, g.GateKey }).IsUnique();
            e.HasIndex(g => g.ApproverUserId);
            e.Property(g => g.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<FeatureSubStage>(e =>
        {
            e.Property(s => s.Track).HasConversion<short>();
            e.Property(s => s.PhaseKind).HasConversion<short>();
            e.HasIndex(s => new { s.FeatureId, s.Track, s.PhaseKind, s.Ordinal }).IsUnique();
            e.HasIndex(s => s.OwnerUserId);
            e.HasIndex(s => new { s.FeatureId, s.Track, s.PhaseKind });
            e.Property(s => s.Version).IsConcurrencyToken();
        });
    }
}
