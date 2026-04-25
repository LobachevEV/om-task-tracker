using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class UpdateStagePlannedEndHandlerTests
{
    public UpdateStagePlannedEndHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static UpdateStagePlannedEndHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<UpdateStagePlannedEndHandler>.Instance);

    [Fact]
    public async Task Update_HappyPath_SetsStageEndAndRecomputesFeatureDates()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var dto = await Handler(db).Update(
            new UpdateStagePlannedEndRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "2026-06-30",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development)
            .PlannedEnd.Should().Be("2026-06-30");
        dto.PlannedEnd.Should().Be("2026-06-30");
    }

    [Fact]
    public async Task Update_EndBeforeExistingStart_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Seed a start first
        var startHandler = new UpdateStagePlannedStartHandler(
            db, NullLogger<UpdateStagePlannedStartHandler>.Instance);
        await startHandler.Update(
            new OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand.UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedStart = "2026-05-10",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateStagePlannedEndRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "2026-05-01", // before existing start
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
            new UpdateStagePlannedEndRequest
            {
                FeatureId = 999,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "2026-05-01",
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
            new UpdateStagePlannedEndRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "2026-05-01",
                CallerUserId = 6,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    // Regression: BE-002-02 — year guard on planned-end mirror.
    [Fact]
    public async Task Update_YearBelow2000_ThrowsInvalidArgumentWithRealReleaseDateMessage()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateStagePlannedEndRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "1999-12-31",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Be("Use a real release date");
    }

    // Regression: BE-002-01 — cross-stage chronological validator on the
    // planned-end mirror. Mutating Development.End past Testing.Start trips
    // the validator; surface 422 with `conflict.kind="overlap"`.
    [Fact]
    public async Task Update_DevelopmentEndAfterTestingStart_ThrowsFailedPreconditionWithOverlapEnvelope()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Seed Testing.PlannedStart = 2026-05-20 via the start handler.
        var startHandler = new UpdateStagePlannedStartHandler(
            db, NullLogger<UpdateStagePlannedStartHandler>.Instance);
        await startHandler.Update(
            new OneMoreTaskTracker.Proto.Features.UpdateStagePlannedStartCommand.UpdateStagePlannedStartRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Testing,
                PlannedStart = "2026-05-20",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        // Now attempt Development.PlannedEnd = 2026-05-25 (past Testing.start).
        var act = () => Handler(db).Update(
            new UpdateStagePlannedEndRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                PlannedEnd = "2026-05-25",
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
        ex.Which.Status.Detail.Should().StartWith("Stage order violation|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"with\":\"Testing\"");
    }
}
