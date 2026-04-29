using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class StageEditContextLoaderTests
{
    public StageEditContextLoaderTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task LoadAsync_WhenFeatureIdInvalid_ThrowsInvalidArgument()
    {
        var db = NewDb();

        var act = () => StageEditContextLoader.LoadAsync(
            db, featureId: 0, ProtoFeatureState.Development, callerUserId: 1,
            hasExpectedStageVersion: false, expectedStageVersion: 0, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Be("feature_id is required");
    }

    [Fact]
    public async Task LoadAsync_WhenStageUndefined_ThrowsInvalidArgument()
    {
        var db = NewDb();

        var act = () => StageEditContextLoader.LoadAsync(
            db, featureId: 1, stage: (ProtoFeatureState)999, callerUserId: 1,
            hasExpectedStageVersion: false, expectedStageVersion: 0, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Be("stage is required");
    }

    [Fact]
    public async Task LoadAsync_WhenCallerIsNotOwner_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 5 },
            TestServerCallContext.Create());

        var act = () => StageEditContextLoader.LoadAsync(
            db, created.Id, ProtoFeatureState.Development, callerUserId: 6,
            hasExpectedStageVersion: false, expectedStageVersion: 0, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task LoadAsync_WhenStageVersionMismatch_ThrowsAlreadyExists()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => StageEditContextLoader.LoadAsync(
            db, created.Id, ProtoFeatureState.Development, callerUserId: 1,
            hasExpectedStageVersion: true, expectedStageVersion: 99, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Which.Status.Detail.Should().StartWith("Updated by someone else");
    }

    [Fact]
    public async Task LoadAsync_WhenAllChecksPass_ReturnsFeatureAndPlan()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var ctx = await StageEditContextLoader.LoadAsync(
            db, created.Id, ProtoFeatureState.Development, callerUserId: 1,
            hasExpectedStageVersion: false, expectedStageVersion: 0, CancellationToken.None);

        ctx.Feature.Id.Should().Be(created.Id);
        ctx.Plan.Stage.Should().Be((int)ProtoFeatureState.Development);
        ctx.StageOrdinal.Should().Be((int)ProtoFeatureState.Development);
    }
}
