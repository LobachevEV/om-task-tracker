using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Users.Data;

public class UsersDbContext(DbContextOptions<UsersDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("users");

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.HasMany(u => u.TeamMembers)
                .WithOne(u => u.Manager)
                .HasForeignKey(u => u.ManagerId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
