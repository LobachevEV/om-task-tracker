using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
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
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Tests.Infra;

public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    public UserService.UserServiceClient MockUserService { get; } =
        Substitute.For<UserService.UserServiceClient>();

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
                d.ServiceType == typeof(TaskFeatureLinker.TaskFeatureLinkerClient) ||
                d.ServiceType == typeof(FeatureCreator.FeatureCreatorClient) ||
                d.ServiceType == typeof(FeatureUpdater.FeatureUpdaterClient) ||
                d.ServiceType == typeof(FeaturesLister.FeaturesListerClient) ||
                d.ServiceType == typeof(FeatureGetter.FeatureGetterClient) ||
                d.ServiceType == typeof(FeatureTitleUpdater.FeatureTitleUpdaterClient) ||
                d.ServiceType == typeof(FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient) ||
                d.ServiceType == typeof(StageOwnerUpdater.StageOwnerUpdaterClient) ||
                d.ServiceType == typeof(StagePlannedStartUpdater.StagePlannedStartUpdaterClient) ||
                d.ServiceType == typeof(StagePlannedEndUpdater.StagePlannedEndUpdaterClient)
            ).ToList();

            foreach (var descriptor in descriptors)
                services.Remove(descriptor);

            services.AddSingleton(MockUserService);
            services.AddSingleton(Substitute.For<TaskCreator.TaskCreatorClient>());
            services.AddSingleton(Substitute.For<TaskLister.TaskListerClient>());
            services.AddSingleton(Substitute.For<TaskGetter.TaskGetterClient>());
            services.AddSingleton(Substitute.For<TaskMover.TaskMoverClient>());
            services.AddSingleton(Substitute.For<TaskFeatureLinker.TaskFeatureLinkerClient>());
            services.AddSingleton(Substitute.For<FeatureCreator.FeatureCreatorClient>());
            services.AddSingleton(Substitute.For<FeatureUpdater.FeatureUpdaterClient>());
            services.AddSingleton(Substitute.For<FeaturesLister.FeaturesListerClient>());
            services.AddSingleton(Substitute.For<FeatureGetter.FeatureGetterClient>());
            services.AddSingleton(Substitute.For<FeatureTitleUpdater.FeatureTitleUpdaterClient>());
            services.AddSingleton(Substitute.For<FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient>());
            services.AddSingleton(Substitute.For<StageOwnerUpdater.StageOwnerUpdaterClient>());
            services.AddSingleton(Substitute.For<StagePlannedStartUpdater.StagePlannedStartUpdaterClient>());
            services.AddSingleton(Substitute.For<StagePlannedEndUpdater.StagePlannedEndUpdaterClient>());
        });
    }
}
