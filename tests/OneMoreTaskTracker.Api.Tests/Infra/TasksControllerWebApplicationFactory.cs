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
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
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

    public TaskFeatureLinker.TaskFeatureLinkerClient MockTaskFeatureLinker { get; } =
        Substitute.For<TaskFeatureLinker.TaskFeatureLinkerClient>();

    public FeatureCreator.FeatureCreatorClient MockFeatureCreator { get; } =
        Substitute.For<FeatureCreator.FeatureCreatorClient>();

    public FeatureUpdater.FeatureUpdaterClient MockFeatureUpdater { get; } =
        Substitute.For<FeatureUpdater.FeatureUpdaterClient>();

    public FeaturesLister.FeaturesListerClient MockFeaturesLister { get; } =
        Substitute.For<FeaturesLister.FeaturesListerClient>();

    public FeatureGetter.FeatureGetterClient MockFeatureGetter { get; } =
        Substitute.For<FeatureGetter.FeatureGetterClient>();

    public FeatureTitleUpdater.FeatureTitleUpdaterClient MockFeatureTitleUpdater { get; } =
        Substitute.For<FeatureTitleUpdater.FeatureTitleUpdaterClient>();

    public FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient MockFeatureDescriptionUpdater { get; } =
        Substitute.For<FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient>();

    public StageOwnerUpdater.StageOwnerUpdaterClient MockStageOwnerUpdater { get; } =
        Substitute.For<StageOwnerUpdater.StageOwnerUpdaterClient>();

    public StagePlannedStartUpdater.StagePlannedStartUpdaterClient MockStagePlannedStartUpdater { get; } =
        Substitute.For<StagePlannedStartUpdater.StagePlannedStartUpdaterClient>();

    public StagePlannedEndUpdater.StagePlannedEndUpdaterClient MockStagePlannedEndUpdater { get; } =
        Substitute.For<StagePlannedEndUpdater.StagePlannedEndUpdaterClient>();

    public FeaturePatcher.FeaturePatcherClient MockFeaturePatcher { get; } =
        Substitute.For<FeaturePatcher.FeaturePatcherClient>();

    public FeatureStagePatcher.FeatureStagePatcherClient MockFeatureStagePatcher { get; } =
        Substitute.For<FeatureStagePatcher.FeatureStagePatcherClient>();

    public string GenerateToken(int userId, string email, string role, int? managerId = null)
    {
        using var scope = Services.CreateScope();
        var tokenService = scope.ServiceProvider.GetRequiredService<JwtTokenService>();
        return tokenService.GenerateToken(userId, email, role, managerId);
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
                ["FeaturesService:Address"] = "http://localhost:5000",
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
                d.ServiceType == typeof(TaskAggregateQuery.TaskAggregateQueryClient) ||
                d.ServiceType == typeof(TaskFeatureLinker.TaskFeatureLinkerClient) ||
                d.ServiceType == typeof(FeatureCreator.FeatureCreatorClient) ||
                d.ServiceType == typeof(FeatureUpdater.FeatureUpdaterClient) ||
                d.ServiceType == typeof(FeaturesLister.FeaturesListerClient) ||
                d.ServiceType == typeof(FeatureGetter.FeatureGetterClient) ||
                d.ServiceType == typeof(FeatureTitleUpdater.FeatureTitleUpdaterClient) ||
                d.ServiceType == typeof(FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient) ||
                d.ServiceType == typeof(StageOwnerUpdater.StageOwnerUpdaterClient) ||
                d.ServiceType == typeof(StagePlannedStartUpdater.StagePlannedStartUpdaterClient) ||
                d.ServiceType == typeof(StagePlannedEndUpdater.StagePlannedEndUpdaterClient) ||
                d.ServiceType == typeof(FeaturePatcher.FeaturePatcherClient) ||
                d.ServiceType == typeof(FeatureStagePatcher.FeatureStagePatcherClient)
            ).ToList();

            foreach (var descriptor in descriptors)
                services.Remove(descriptor);

            services.AddSingleton(MockUserService);
            services.AddSingleton(MockTaskCreator);
            services.AddSingleton(MockTaskLister);
            services.AddSingleton(MockTaskGetter);
            services.AddSingleton(MockTaskMover);
            services.AddSingleton(MockTaskAggregateQuery);
            services.AddSingleton(MockTaskFeatureLinker);
            services.AddSingleton(MockFeatureCreator);
            services.AddSingleton(MockFeatureUpdater);
            services.AddSingleton(MockFeaturesLister);
            services.AddSingleton(MockFeatureGetter);
            services.AddSingleton(MockFeatureTitleUpdater);
            services.AddSingleton(MockFeatureDescriptionUpdater);
            services.AddSingleton(MockStageOwnerUpdater);
            services.AddSingleton(MockStagePlannedStartUpdater);
            services.AddSingleton(MockStagePlannedEndUpdater);
            services.AddSingleton(MockFeaturePatcher);
            services.AddSingleton(MockFeatureStagePatcher);

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
