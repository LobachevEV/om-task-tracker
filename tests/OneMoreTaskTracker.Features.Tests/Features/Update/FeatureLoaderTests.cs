using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class FeatureLoaderTests
{
    public FeatureLoaderTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task LoadWithStagePlansAsync_WhenFeatureExists_ReturnsFeatureWithStagePlans()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var loaded = await FeatureLoader.LoadWithStagePlansAsync(db, created.Id, CancellationToken.None);

        loaded.Id.Should().Be(created.Id);
        loaded.StagePlans.Should().HaveCount(5);
    }

    [Fact]
    public async Task LoadWithStagePlansAsync_WhenFeatureMissing_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => FeatureLoader.LoadWithStagePlansAsync(db, featureId: 999, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
        ex.Which.Status.Detail.Should().Contain("999");
    }

    [Fact]
    public async Task ResolveStage_WhenStagePresent_ReturnsPlan()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());
        var feature = await FeatureLoader.LoadWithStagePlansAsync(db, created.Id, CancellationToken.None);

        var plan = FeatureLoader.ResolveStage(feature, stageOrdinal: (int)FeatureState.Development, stageDisplay: "Development");

        plan.Stage.Should().Be((int)FeatureState.Development);
    }

    [Fact]
    public async Task ResolveStage_WhenStageMissing_ThrowsNotFound()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());
        var feature = await FeatureLoader.LoadWithStagePlansAsync(db, created.Id, CancellationToken.None);

        var act = () => FeatureLoader.ResolveStage(feature, stageOrdinal: 999, stageDisplay: "MysteryStage");

        var ex = act.Should().Throw<RpcException>().Which;
        ex.StatusCode.Should().Be(StatusCode.NotFound);
        ex.Status.Detail.Should().Contain("MysteryStage");
    }
}
