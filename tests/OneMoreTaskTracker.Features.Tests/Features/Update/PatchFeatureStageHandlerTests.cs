using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class PatchFeatureStageHandlerTests
{
    public PatchFeatureStageHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PatchFeatureStageHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<PatchFeatureStageHandler>.Instance);

    private static async Task<OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto> CreateFeatureAsync(
        FeaturesDbContext db,
        int managerUserId = 1)
    {
        var request = new CreateFeatureRequest
        {
            Title = "X",
            ManagerUserId = managerUserId,
        };
        return await new CreateFeatureHandler(db).Create(request, TestServerCallContext.Create());
    }

    [Fact]
    public async Task Patch_OwnerOnly_BumpsStageAndFeatureVersionByOne()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 42,
            },
            TestServerCallContext.Create());

        var devStage = dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development);
        devStage.PerformerUserId.Should().Be(42);
        devStage.Version.Should().Be(1);
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Patch_PlannedStartOnly_SetsDateAndRecomputesFeatureDates()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                PlannedStart = "2026-05-10",
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development)
            .PlannedStart.Should().Be("2026-05-10");
        dto.PlannedStart.Should().Be("2026-05-10");
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Patch_PlannedEndOnly_SetsDateAndRecomputesFeatureDates()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                PlannedEnd = "2026-06-01",
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development)
            .PlannedEnd.Should().Be("2026-06-01");
        dto.PlannedEnd.Should().Be("2026-06-01");
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Patch_AllThreeFieldsAtOnce_BumpsStageVersionByThreeAndFeatureVersionByOneWithSingleSnapshot()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 7,
                PlannedStart = "2026-05-10",
                PlannedEnd = "2026-06-01",
            },
            TestServerCallContext.Create());

        var devStage = dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development);
        devStage.PerformerUserId.Should().Be(7);
        devStage.PlannedStart.Should().Be("2026-05-10");
        devStage.PlannedEnd.Should().Be("2026-06-01");
        devStage.Version.Should().Be(3);
        dto.Version.Should().Be(created.Version + 1);

        var stored = await db.Features.AsNoTracking()
            .Include(f => f.StagePlans)
            .SingleAsync(f => f.Id == created.Id);
        var storedDev = stored.StagePlans.Single(sp => sp.Stage == (int)ProtoFeatureState.Development);
        storedDev.UpdatedAt.Should().Be(stored.UpdatedAt);
    }

    [Fact]
    public async Task Patch_NoFields_ReturnsCurrentSnapshotWithoutBumpingVersion()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);
        var devBefore = created.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development);

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        dto.Version.Should().Be(created.Version);
        var devAfter = dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development);
        devAfter.Version.Should().Be(devBefore.Version);
        devAfter.PerformerUserId.Should().Be(devBefore.PerformerUserId);
        devAfter.PlannedStart.Should().Be(devBefore.PlannedStart);
        devAfter.PlannedEnd.Should().Be(devBefore.PlannedEnd);

        var stored = await db.Features.AsNoTracking()
            .Include(f => f.StagePlans)
            .SingleAsync(f => f.Id == created.Id);
        stored.Version.Should().Be(created.Version);
    }

    [Fact]
    public async Task Patch_ZeroOwner_ClearsAssignment()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);
        await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Testing,
                CallerUserId = 1,
                StageOwnerUserId = 7,
            },
            TestServerCallContext.Create());

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Testing,
                CallerUserId = 1,
                StageOwnerUserId = 0,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Testing).PerformerUserId.Should().Be(0);
    }

    [Fact]
    public async Task Patch_NegativeOwner_CoercesToZero()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.CsApproving,
                CallerUserId = 1,
                StageOwnerUserId = -5,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.CsApproving).PerformerUserId.Should().Be(0);
    }

    [Fact]
    public async Task Patch_EmptyPlannedStart_ClearsStageStart()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);
        await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                PlannedStart = "2026-05-10",
            },
            TestServerCallContext.Create());

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                PlannedStart = string.Empty,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development)
            .PlannedStart.Should().BeEmpty();
    }

    [Fact]
    public async Task Patch_InvalidPlannedStart_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = "not-a-date",
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_PlannedEndBeforePlannedStartInSameRequest_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = "2026-06-01",
            PlannedEnd = "2026-05-01",
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_YearBelow2000_ThrowsInvalidArgumentWithRealReleaseDateMessage()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = ProtoFeatureState.Development,
            CallerUserId = 1,
            PlannedStart = "1899-01-01",
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Be("Use a real release date");
    }

    [Fact]
    public async Task Patch_TestingStartBeforeDevelopmentEnd_ThrowsFailedPreconditionWithOverlapEnvelope()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                PlannedEnd = "2026-05-15",
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Testing,
                CallerUserId = 1,
                PlannedStart = "2026-05-10",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
        ex.Which.Status.Detail.Should().StartWith("Stage order violation|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"kind\":\"overlap\"");
        ex.Which.Status.Detail.Should().Contain("\"with\":\"Development\"");
    }

    [Fact]
    public async Task Patch_UnknownFeature_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = 999,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Patch_UndefinedStage_ThrowsInvalidArgument()
    {
        var validator = new PatchFeatureStageRequestValidator();
        var request = new PatchFeatureStageRequest
        {
            FeatureId = 1,
            Stage = (ProtoFeatureState)999,
            CallerUserId = 1,
            StageOwnerUserId = 1,
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Patch_WhenCallerIsNotOwner_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db, managerUserId: 5);

        var act = () => Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 6,
                StageOwnerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Patch_WhenCallerUserIdIsMissing_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var act = () => Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                StageOwnerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Patch_WithStaleExpectedStageVersion_ThrowsAlreadyExistsWithConflictMarker()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 1,
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 2,
                ExpectedStageVersion = 0,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Which.Status.Detail.Should().StartWith("Updated by someone else");
        ex.Which.Status.Detail.Should().Contain("|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"currentVersion\":1");
    }

    [Fact]
    public async Task Patch_WithoutExpectedStageVersion_SkipsConcurrencyCheck()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 1,
            },
            TestServerCallContext.Create());

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 2,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development)
            .PerformerUserId.Should().Be(2);
    }

    [Fact]
    public async Task Patch_PreservesStagePlansInResponseShape()
    {
        var db = NewDb();
        var created = await CreateFeatureAsync(db);

        var dto = await Handler(db).Patch(
            new PatchFeatureStageRequest
            {
                FeatureId = created.Id,
                Stage = ProtoFeatureState.Development,
                CallerUserId = 1,
                StageOwnerUserId = 7,
            },
            TestServerCallContext.Create());

        dto.StagePlans.Count.Should().Be(created.StagePlans.Count);
        dto.StagePlans.Count.Should().BeGreaterThan(0);
    }
}
