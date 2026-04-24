using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class UpdateStagePlannedStartHandlerTests
{
    public UpdateStagePlannedStartHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static UpdateStagePlannedStartHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<UpdateStagePlannedStartHandler>.Instance);

    [Fact]
    public async Task Update_HappyPath_SetsStageStartAndRecomputesFeatureDates()
    {
        // Arrange
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Act
        var dto = await Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedStart = "2026-05-10",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        // Assert
        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development)
            .PlannedStart.Should().Be("2026-05-10");
        // Derived feature date recomputed from min(stage starts).
        dto.PlannedStart.Should().Be("2026-05-10");
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Update_EmptyString_ClearsStageStart()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());
        await Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedStart = "2026-05-10",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var dto = await Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedStart = string.Empty,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development)
            .PlannedStart.Should().BeEmpty();
    }

    [Fact]
    public async Task Update_InvalidDate_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedStart = "not-a-date",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_StartAfterExistingEnd_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Seed an end first
        var endHandler = new UpdateStagePlannedEndHandler(
            db, NullLogger<UpdateStagePlannedEndHandler>.Instance);
        await endHandler.Update(
            new OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand.UpdateStagePlannedEndRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "2026-05-01",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedStart = "2026-05-10", // after the existing end
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_UnknownFeature_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = 999,
                Stage = ProtoFeatureState.Development,
                PlannedStart = "2026-05-01",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Update_WhenCallerIsNotOwner_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 5 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedStart = "2026-05-01",
                CallerUserId = 6,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }
}
