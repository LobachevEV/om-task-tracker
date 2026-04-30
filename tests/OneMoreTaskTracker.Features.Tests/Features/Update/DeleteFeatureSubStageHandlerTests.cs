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
using OneMoreTaskTracker.Proto.Features.DeleteFeatureSubStageCommand;
using Xunit;
using ProtoFeaturePhaseKind = OneMoreTaskTracker.Proto.Features.FeaturePhaseKind;
using ProtoFeatureTrack = OneMoreTaskTracker.Proto.Features.FeatureTrack;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class DeleteFeatureSubStageHandlerTests
{
    public DeleteFeatureSubStageHandlerTests() => FeatureMappingConfig.Register();

    private const int ManagerUserId = 31;

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static DeleteFeatureSubStageHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<DeleteFeatureSubStageHandler>.Instance, TestRequestClock.System());

    private static AppendFeatureSubStageHandler AppendHandler(FeaturesDbContext db) =>
        new(db, NullLogger<AppendFeatureSubStageHandler>.Instance, TestRequestClock.System());

    private static async Task<int> CreateFeatureAsync(FeaturesDbContext db)
    {
        var dto = await new CreateFeatureHandler(db, TestRequestClock.System()).Create(
            new CreateFeatureRequest { Title = "Deletable", ManagerUserId = ManagerUserId },
            TestServerCallContext.Create());
        return dto.Id;
    }

    [Fact]
    public async Task Delete_OnLastRemainingSubStageInPhase_ThrowsFailedPrecondition()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var feature = await db.Features.Include(f => f.SubStages).SingleAsync(f => f.Id == featureId);
        var seeded = feature.SubStages.Single(s => s.Track == Track.Backend && s.PhaseKind == PhaseKind.Development);

        var act = () => Handler(db).Delete(
            new DeleteFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = seeded.Id,
                CallerUserId = ManagerUserId,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
    }

    [Fact]
    public async Task Delete_OnEthalonTesting_ThrowsFailedPrecondition()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var feature = await db.Features.Include(f => f.SubStages).SingleAsync(f => f.Id == featureId);
        var ethalon = feature.SubStages.First(s => s.PhaseKind == PhaseKind.EthalonTesting);

        var act = () => Handler(db).Delete(
            new DeleteFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = ethalon.Id,
                CallerUserId = ManagerUserId,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
    }

    [Fact]
    public async Task Delete_OneOfTwoDevelopmentSubStages_RecomputesOrdinals_AndBumpsFeatureVersion()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var appendResp = await AppendHandler(db).Append(
            new AppendFeatureSubStageRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                Track = "backend",
                Phase = "development",
            },
            TestServerCallContext.Create());

        var versionBefore = appendResp.FeatureVersion;
        var firstId = appendResp.Taxonomy.SubStages
            .First(s => s.Track == ProtoFeatureTrack.TrackBackend
                        && s.PhaseKind == ProtoFeaturePhaseKind.PhaseKindDevelopment
                        && s.Ordinal == 1).Id;

        var deleteResp = await Handler(db).Delete(
            new DeleteFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = firstId,
                CallerUserId = ManagerUserId,
            },
            TestServerCallContext.Create());

        deleteResp.FeatureVersion.Should().Be(versionBefore + 1);

        var devBackend = deleteResp.Taxonomy.SubStages
            .Where(s => s.Track == ProtoFeatureTrack.TrackBackend
                        && s.PhaseKind == ProtoFeaturePhaseKind.PhaseKindDevelopment)
            .OrderBy(s => s.Ordinal)
            .ToList();
        devBackend.Should().ContainSingle();
        devBackend[0].Ordinal.Should().Be(1);
    }

    [Fact]
    public async Task Delete_VersionMismatch_ThrowsAlreadyExists()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        await AppendHandler(db).Append(
            new AppendFeatureSubStageRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                Track = "backend",
                Phase = "development",
            },
            TestServerCallContext.Create());

        var feature = await db.Features.Include(f => f.SubStages).AsNoTracking().SingleAsync(f => f.Id == featureId);
        var subStage = feature.SubStages.First(s => s.Track == Track.Backend && s.PhaseKind == PhaseKind.Development);

        var act = () => Handler(db).Delete(
            new DeleteFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = subStage.Id,
                CallerUserId = ManagerUserId,
                ExpectedVersion = 99,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
    }
}
