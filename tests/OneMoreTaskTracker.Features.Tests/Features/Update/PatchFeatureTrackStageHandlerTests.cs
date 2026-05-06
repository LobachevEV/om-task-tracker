using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackStageCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class PatchFeatureTrackStageHandlerTests
{
    public PatchFeatureTrackStageHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PatchFeatureTrackStageHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<PatchFeatureTrackStageHandler>.Instance, TestRequestClock.System());

    private static async Task<FeatureDto> CreateFeatureAsync(FeaturesDbContext db, int managerUserId = 1)
    {
        var request = new CreateFeatureRequest
        {
            Title = "Test Feature",
            ManagerUserId = managerUserId,
        };
        return await new CreateFeatureHandler(db, TestRequestClock.System()).Create(request, TestServerCallContext.Create());
    }

    [Fact]
    public async Task Patch_WhenTrackAndStageDoNotExist_CreatesTrackAndStageWithOwner()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var result = await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 42,
            },
            TestServerCallContext.Create());

        var stage = result.Stages.Single(s => s.StageKey == FeatureTrackStageKey.TrackStageDevelopment);
        stage.StageOwnerUserId.Should().Be(42);
        result.Stages.Should().HaveCountGreaterThan(0);

        var trackCount = await db.FeatureTracks.CountAsync(t => t.FeatureId == feature.Id);
        trackCount.Should().Be(1);
    }

    [Fact]
    public async Task Patch_WhenStageExistsAndOwnerSent_UpdatesOwner()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 10,
            },
            TestServerCallContext.Create());

        var result = await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 20,
            },
            TestServerCallContext.Create());

        result.Stages.Single(s => s.StageKey == FeatureTrackStageKey.TrackStageDevelopment)
            .StageOwnerUserId.Should().Be(20);
    }

    [Fact]
    public async Task Patch_SentinelMinusOneOwner_ClearsStageOwner()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 15,
            },
            TestServerCallContext.Create());

        var result = await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = -1,
            },
            TestServerCallContext.Create());

        result.Stages.Single(s => s.StageKey == FeatureTrackStageKey.TrackStageDevelopment)
            .StageOwnerUserId.Should().Be(0);
    }

    [Fact]
    public async Task Patch_PlannedStartAndEnd_SetsDatesOnStage()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var result = await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Backend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                PlannedStart = "2026-05-01",
                PlannedEnd = "2026-05-31",
            },
            TestServerCallContext.Create());

        var stage = result.Stages.Single(s => s.StageKey == FeatureTrackStageKey.TrackStageDevelopment);
        stage.PlannedStart.Should().Be("2026-05-01");
        stage.PlannedEnd.Should().Be("2026-05-31");
    }

    [Fact]
    public async Task Patch_WhenNoFieldsSet_ReturnsCurrentSnapshotWithoutBumpingVersion()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var created = await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 5,
            },
            TestServerCallContext.Create());

        var createdVersion = created.Stages
            .Single(s => s.StageKey == FeatureTrackStageKey.TrackStageDevelopment).StageVersion;

        var noop = await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        noop.Stages.Single(s => s.StageKey == FeatureTrackStageKey.TrackStageDevelopment)
            .StageVersion.Should().Be(createdVersion);
    }

    [Fact]
    public async Task Patch_WhenCallerIsNotFeatureManager_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db, managerUserId: 5);

        var act = () => Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 6,
                StageOwnerUserId = 6,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Patch_WhenFeatureDoesNotExist_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = 999,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Patch_WithStaleExpectedStageVersion_ThrowsAlreadyExists()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 10,
            },
            TestServerCallContext.Create());

        await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 20,
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 30,
                ExpectedStageVersion = 0,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Which.Status.Detail.Should().Contain("|conflict=");
    }

    [Fact]
    public async Task Patch_WhenLaterStageStartOverlapsEarlierStageEnd_ThrowsFailedPrecondition()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        // Both stages belong to Frontend: SrApproving then Development
        await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageSrApproving,
                CallerUserId = 1,
                PlannedEnd = "2026-05-15",
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                PlannedStart = "2026-05-10",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
        ex.Which.Status.Detail.Should().StartWith("Stage order violation|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"kind\":\"overlap\"");
    }

    [Fact]
    public async Task Patch_BackendTrackWithSrApprovingStageKey_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureTrackStageRequestValidator();
        var request = new PatchFeatureTrackStageRequest
        {
            FeatureId = 1,
            Kind = FeatureTrackKind.Backend,
            StageKey = FeatureTrackStageKey.TrackStageSrApproving,
            CallerUserId = 1,
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Contain("SrApproving");
    }

    [Fact]
    public async Task Patch_FrontendTrackWithCsApprovingStageKey_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureTrackStageRequestValidator();
        var request = new PatchFeatureTrackStageRequest
        {
            FeatureId = 1,
            Kind = FeatureTrackKind.Frontend,
            StageKey = FeatureTrackStageKey.TrackStageCsApproving,
            CallerUserId = 1,
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Contain("CsApproving");
    }

    [Fact]
    public async Task Patch_SparseFields_OnlySetsProvidedFieldsAndPreservesOthers()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Backend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                StageOwnerUserId = 5,
                PlannedStart = "2026-04-01",
                PlannedEnd = "2026-04-30",
            },
            TestServerCallContext.Create());

        var result = await Handler(db).Patch(
            new PatchFeatureTrackStageRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Backend,
                StageKey = FeatureTrackStageKey.TrackStageDevelopment,
                CallerUserId = 1,
                PlannedEnd = "2026-05-10",
            },
            TestServerCallContext.Create());

        var stage = result.Stages.Single(s => s.StageKey == FeatureTrackStageKey.TrackStageDevelopment);
        stage.PlannedStart.Should().Be("2026-04-01");
        stage.PlannedEnd.Should().Be("2026-05-10");
        stage.StageOwnerUserId.Should().Be(5);
    }

    [Fact]
    public async Task Patch_ValidationRejectsInvalidDateFormat_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureTrackStageRequestValidator();
        var request = new PatchFeatureTrackStageRequest
        {
            FeatureId = 1,
            Kind = FeatureTrackKind.Frontend,
            StageKey = FeatureTrackStageKey.TrackStageDevelopment,
            CallerUserId = 1,
            PlannedStart = "not-a-date",
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_ValidationRejectsEndBeforeStart_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureTrackStageRequestValidator();
        var request = new PatchFeatureTrackStageRequest
        {
            FeatureId = 1,
            Kind = FeatureTrackKind.Frontend,
            StageKey = FeatureTrackStageKey.TrackStageDevelopment,
            CallerUserId = 1,
            PlannedStart = "2026-06-01",
            PlannedEnd = "2026-05-01",
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }
}
