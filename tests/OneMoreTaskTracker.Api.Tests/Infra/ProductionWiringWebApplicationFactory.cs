using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace OneMoreTaskTracker.Api.Tests.Infra;

/// <summary>
/// Factory that exercises production DI wiring without mocking gRPC clients.
/// Used solely to verify that all gRPC client registrations in Program.cs
/// are actually resolvable from the container. Tests should not mock clients;
/// the factories used by behavior tests (ApiWebApplicationFactory, TasksControllerWebApplicationFactory)
/// handle mocking for isolation.
/// </summary>
public sealed class ProductionWiringWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = TestJwtDefaults.Secret,
                ["Jwt:Issuer"] = TestJwtDefaults.Issuer,
                ["Jwt:Audience"] = TestJwtDefaults.Audience,
                ["Jwt:ExpirationMinutes"] = TestJwtDefaults.ExpirationMinutes,
                ["TasksService:Address"] = "http://localhost:5000",
                ["UsersService:Address"] = "http://localhost:5000",
                ["Cors:AllowedOrigins:0"] = "http://localhost:3000"
            });
        });
    }
}
