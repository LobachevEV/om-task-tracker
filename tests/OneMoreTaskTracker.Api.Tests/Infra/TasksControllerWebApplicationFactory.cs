using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Tests.Infra;

public sealed class TasksControllerWebApplicationFactory : WebApplicationFactory<Program>
{
    public TaskCreator.TaskCreatorClient MockTaskCreator { get; } =
        Substitute.For<TaskCreator.TaskCreatorClient>();

    public TaskLister.TaskListerClient MockTaskLister { get; } =
        Substitute.For<TaskLister.TaskListerClient>();

    public TaskGetter.TaskGetterClient MockTaskGetter { get; } =
        Substitute.For<TaskGetter.TaskGetterClient>();

    public TaskMover.TaskMoverClient MockTaskMover { get; } =
        Substitute.For<TaskMover.TaskMoverClient>();

    public UserService.UserServiceClient MockUserService { get; } =
        Substitute.For<UserService.UserServiceClient>();

    public TaskAggregateQuery.TaskAggregateQueryClient MockTaskAggregateQuery { get; } =
        Substitute.For<TaskAggregateQuery.TaskAggregateQueryClient>();

    public string GenerateToken(int userId, string email, string role)
    {
        using var scope = Services.CreateScope();
        var tokenService = scope.ServiceProvider.GetRequiredService<JwtTokenService>();
        return tokenService.GenerateToken(userId, email, role);
    }

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

        builder.ConfigureTestServices(services =>
        {
            var descriptors = services.Where(d =>
                d.ServiceType == typeof(UserService.UserServiceClient) ||
                d.ServiceType == typeof(TaskCreator.TaskCreatorClient) ||
                d.ServiceType == typeof(TaskLister.TaskListerClient) ||
                d.ServiceType == typeof(TaskGetter.TaskGetterClient) ||
                d.ServiceType == typeof(TaskMover.TaskMoverClient) ||
                d.ServiceType == typeof(TaskAggregateQuery.TaskAggregateQueryClient)
            ).ToList();

            foreach (var descriptor in descriptors)
                services.Remove(descriptor);

            services.AddSingleton(MockUserService);
            services.AddSingleton(MockTaskCreator);
            services.AddSingleton(MockTaskLister);
            services.AddSingleton(MockTaskGetter);
            services.AddSingleton(MockTaskMover);
            services.AddSingleton(MockTaskAggregateQuery);

            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters.IssuerSigningKey =
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtDefaults.Secret));
                options.TokenValidationParameters.ValidIssuer = TestJwtDefaults.Issuer;
                options.TokenValidationParameters.ValidAudience = TestJwtDefaults.Audience;
            });
        });
    }
}
