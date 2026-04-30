using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureSubStageCommand;
using Xunit;
using ProtoFeaturePhaseKind = OneMoreTaskTracker.Proto.Features.FeaturePhaseKind;
using ProtoFeatureTrack = OneMoreTaskTracker.Proto.Features.FeatureTrack;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class AppendFeatureSubStageHandlerTests
{
    public AppendFeatureSubStageHandlerTests() => FeatureMappingConfig.Register();

    private const int ManagerUserId = 21;

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static AppendFeatureSubStageHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<AppendFeatureSubStageHandler>.Instance, TestRequestClock.System());

    private static async Task<int> CreateFeatureAsync(FeaturesDbContext db)
    {
        var dto = await new CreateFeatureHandler(db, TestRequestClock.System()).Create(
            new CreateFeatureRequest { Title = "Branchy", ManagerUserId = ManagerUserId },
            TestServerCallContext.Create());
        return dto.Id;
    }

    [Fact]
    public async Task Append_DevelopmentBackend_AddsSubStageWithOrdinalTwo_AndBumpsFeatureVersion()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);
        var versionBefore = (await db.Features.AsNoTracking().SingleAsync(f => f.Id == featureId)).Version;

        var response = await Handler(db).Append(
            new AppendFeatureSubStageRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                Track = "backend",
                Phase = "development",
                OwnerUserId = 88,
            },
            TestServerCallContext.Create());

        response.FeatureVersion.Should().Be(versionBefore + 1);
        response.CreatedSubStageId.Should().BeGreaterThan(0);

        var devBackend = response.Taxonomy.SubStages
            .Where(s => s.Track == ProtoFeatureTrack.TrackBackend && s.PhaseKind == ProtoFeaturePhaseKind.PhaseKindDevelopment)
            .OrderBy(s => s.Ordinal)
            .ToList();
        devBackend.Should().HaveCount(2);
        devBackend[1].Ordinal.Should().Be(2);
        devBackend[1].OwnerUserId.Should().Be(88);
    }

    [Fact]
    public async Task Append_OnEthalonTesting_ThrowsFailedPrecondition()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var act = () => Handler(db).Append(
            new AppendFeatureSubStageRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                Track = "backend",
                Phase = "ethalon-testing",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
    }

    [Fact]
    public async Task Append_AtCap_ThrowsFailedPrecondition_WithSubStageCapReached()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        // The seed materializes one sub-stage; cap is 6, so append 5 more then expect the 6th to fail.
        for (var i = 0; i < FeatureStageLayout.SubStageHardCap - 1; i++)
        {
            await Handler(db).Append(
                new AppendFeatureSubStageRequest
                {
                    FeatureId = featureId,
                    CallerUserId = ManagerUserId,
                    Track = "backend",
                    Phase = "development",
                },
                TestServerCallContext.Create());
        }

        var act = () => Handler(db).Append(
            new AppendFeatureSubStageRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                Track = "backend",
                Phase = "development",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
        ex.Which.Status.Detail.Should().Contain("subStageCap");
        ex.Which.Status.Detail.Should().Contain("\"cap\":6");
    }

    [Fact]
    public async Task Append_OverlappingExplicitDates_ThrowsFailedPrecondition_WithSubStageOverlap()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var seedSubStageId = (await db.Features.Include(f => f.SubStages).AsNoTracking().SingleAsync(f => f.Id == featureId))
            .SubStages.Single(s => s.Track == Track.Backend && s.PhaseKind == PhaseKind.Development).Id;

        await new PatchFeatureSubStageHandler(db, NullLogger<PatchFeatureSubStageHandler>.Instance, TestRequestClock.System())
            .Patch(
                new PatchFeatureSubStageRequest
                {
                    FeatureId = featureId,
                    SubStageId = seedSubStageId,
                    CallerUserId = ManagerUserId,
                    PlannedStart = "2026-05-01",
                    PlannedEnd = "2026-05-15",
                },
                TestServerCallContext.Create());

        var act = () => Handler(db).Append(
            new AppendFeatureSubStageRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                Track = "backend",
                Phase = "development",
                PlannedStart = "2026-05-10",
                PlannedEnd = "2026-05-12",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
        ex.Which.Status.Detail.Should().Contain("subStageOverlap");
        ex.Which.Status.Detail.Should().Contain("\"neighborOrdinal\":1");

        var siblings = (await db.Features.Include(f => f.SubStages).AsNoTracking().SingleAsync(f => f.Id == featureId))
            .SubStages.Where(s => s.Track == Track.Backend && s.PhaseKind == PhaseKind.Development).ToList();
        siblings.Should().HaveCount(1);
    }

    [Fact]
    public async Task Append_NonManagerCaller_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var act = () => Handler(db).Append(
            new AppendFeatureSubStageRequest
            {
                FeatureId = featureId,
                CallerUserId = 999,
                Track = "backend",
                Phase = "development",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }
}
