using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class UpdateStageOwnerHandlerTests
{
    public UpdateStageOwnerHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static UpdateStageOwnerHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<UpdateStageOwnerHandler>.Instance);

    [Fact]
    public async Task Update_HappyPath_SetsStageOwnerAndBumpsBothVersions()
    {
        // Arrange
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Act
        var dto = await Handler(db).Update(
            new UpdateStageOwnerRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                StageOwnerUserId = 42,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        // Assert
        var devStage = dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development);
        devStage.PerformerUserId.Should().Be(42);
        devStage.Version.Should().Be(1);
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Update_NullOrZeroOwner_ClearsAssignment()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Seed an assignment first.
        await Handler(db).Update(
            new UpdateStageOwnerRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Testing,
                StageOwnerUserId = 7,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        // Clear it.
        var dto = await Handler(db).Update(
            new UpdateStageOwnerRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Testing,
                StageOwnerUserId = 0, // clear
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Testing).PerformerUserId.Should().Be(0);
    }

    [Fact]
    public async Task Update_NegativeOwner_CoercesToZero()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var dto = await Handler(db).Update(
            new UpdateStageOwnerRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.CsApproving,
                StageOwnerUserId = -5,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.CsApproving).PerformerUserId.Should().Be(0);
    }

    [Fact]
    public async Task Update_UnknownFeature_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => Handler(db).Update(
            new UpdateStageOwnerRequest
            {
                FeatureId = 999,
                Stage = ProtoFeatureState.Development,
                StageOwnerUserId = 1,
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
            new UpdateStageOwnerRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                StageOwnerUserId = 1,
                CallerUserId = 6,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Update_StaleExpectedStageVersion_ThrowsAlreadyExists()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateStageOwnerRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                StageOwnerUserId = 1,
                CallerUserId = 1,
                ExpectedStageVersion = 99,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
    }
}
