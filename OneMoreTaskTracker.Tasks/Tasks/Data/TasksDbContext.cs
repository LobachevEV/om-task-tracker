using Microsoft.EntityFrameworkCore;

namespace OneMoreTaskTracker.Tasks.Tasks.Data;

public class TasksDbContext(DbContextOptions<TasksDbContext> options) : DbContext(options)
{
    public DbSet<Task> Tasks { get; set; }
    public DbSet<GitRepo> GitRepos { get; set; }
    public DbSet<MergeRequest> MergeRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("tasks");
    }
}