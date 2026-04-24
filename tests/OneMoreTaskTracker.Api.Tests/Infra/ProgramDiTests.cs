using Microsoft.Extensions.DependencyInjection;
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
using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Infra;

// Regression guard: controllers inject these gRPC clients, and the behavior-test
// factories mock them away — so a missing AddGrpcClient<T> in Program.cs would
// pass every other test while failing in production. This fact drives the real
// container to catch that class of registration gap.
public sealed class ProgramDiTests(ProductionWiringWebApplicationFactory factory)
    : IClassFixture<ProductionWiringWebApplicationFactory>
{
    [Fact]
    public void Program_ConfiguresAllGrpcClients_SuccessfullyResolvable()
    {
        using var scope = factory.Services.CreateScope();
        var provider = scope.ServiceProvider;

        provider.GetRequiredService<TaskCreator.TaskCreatorClient>();
        provider.GetRequiredService<TaskLister.TaskListerClient>();
        provider.GetRequiredService<TaskGetter.TaskGetterClient>();
        provider.GetRequiredService<TaskMover.TaskMoverClient>();
        provider.GetRequiredService<TaskAggregateQuery.TaskAggregateQueryClient>();
        provider.GetRequiredService<UserService.UserServiceClient>();
        provider.GetRequiredService<TaskFeatureLinker.TaskFeatureLinkerClient>();
        provider.GetRequiredService<FeatureCreator.FeatureCreatorClient>();
        provider.GetRequiredService<FeatureUpdater.FeatureUpdaterClient>();
        provider.GetRequiredService<FeaturesLister.FeaturesListerClient>();
        provider.GetRequiredService<FeatureGetter.FeatureGetterClient>();
        provider.GetRequiredService<FeatureTitleUpdater.FeatureTitleUpdaterClient>();
        provider.GetRequiredService<FeatureDescriptionUpdater.FeatureDescriptionUpdaterClient>();
        provider.GetRequiredService<StageOwnerUpdater.StageOwnerUpdaterClient>();
        provider.GetRequiredService<StagePlannedStartUpdater.StagePlannedStartUpdaterClient>();
        provider.GetRequiredService<StagePlannedEndUpdater.StagePlannedEndUpdaterClient>();
    }
}
