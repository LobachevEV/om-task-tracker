using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Users.Services;

namespace OneMoreTaskTracker.Users.Data;

// Idempotent: keyed on the manager's email — re-runs are no-ops.
public static class DevDataSeeder
{
    internal const string DefaultPassword = "Password123!";

    private const string ManagerEmail = "manager@example.com";

    private static readonly (string Email, string Role)[] TeamMembers =
    [
        ("alice.frontend@example.com", Roles.FrontendDeveloper),
        ("bob.frontend@example.com", Roles.FrontendDeveloper),
        ("charlie.backend@example.com", Roles.BackendDeveloper),
        ("dave.backend@example.com", Roles.BackendDeveloper),
        ("eve.qa@example.com", Roles.Qa),
    ];

    public static async Task SeedAsync(UsersDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (await dbContext.Users.AnyAsync(u => u.Email == ManagerEmail, cancellationToken))
            return;

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(DefaultPassword, workFactor: 12);

        var manager = new User
        {
            Email = ManagerEmail,
            PasswordHash = passwordHash,
            Role = Roles.Manager,
        };
        dbContext.Users.Add(manager);

        foreach (var (email, role) in TeamMembers)
        {
            dbContext.Users.Add(new User
            {
                Email = email,
                PasswordHash = passwordHash,
                Role = role,
                Manager = manager,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
