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

    // Regression: BE-002-02 — year lower-bound guard. Previously only the upper
    // bound (2100) was enforced; 1899-01-01 silently round-tripped at 200.
    [Fact]
    public async Task Update_YearBelow2000_ThrowsInvalidArgumentWithRealReleaseDateMessage()
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
                PlannedStart = "1899-01-01",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Be("Use a real release date");
    }

    [Fact]
    public async Task Update_YearAbove2100_ThrowsInvalidArgumentWithRealReleaseDateMessage()
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
                PlannedStart = "2150-01-01",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Be("Use a real release date");
    }

    // Regression: BE-002-01 — cross-stage chronological-order validator.
    // Previously only same-stage start>end was checked; Testing.start could be
    // < Development.end and the handler returned 200.
    [Fact]
    public async Task Update_TestingStartBeforeDevelopmentEnd_ThrowsFailedPreconditionWithOverlapEnvelope()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Seed Development.PlannedEnd = 2026-05-15
        var endHandler = new UpdateStagePlannedEndHandler(
            db, NullLogger<UpdateStagePlannedEndHandler>.Instance);
        await endHandler.Update(
            new OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand.UpdateStagePlannedEndRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "2026-05-15",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        // Mutate Testing.PlannedStart = 2026-05-10 (before Development.PlannedEnd)
        var act = () => Handler(db).Update(
            new UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Testing,
                PlannedStart = "2026-05-10",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
        ex.Which.Status.Detail.Should().StartWith("Stage order violation|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"kind\":\"overlap\"");
        ex.Which.Status.Detail.Should().Contain("\"with\":\"Development\"");
    }
}
