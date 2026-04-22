using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Features.Features.Data;

public class FeaturesDbContext(DbContextOptions<FeaturesDbContext> options) : DbContext(options)
{
    public DbSet<Feature> Features { get; set; }

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
        });
    }
}
