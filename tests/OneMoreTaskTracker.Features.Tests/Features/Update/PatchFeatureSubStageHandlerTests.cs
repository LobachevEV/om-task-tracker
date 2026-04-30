using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureSubStageCommand;
using Xunit;
using ProtoFeaturePhaseKind = OneMoreTaskTracker.Proto.Features.FeaturePhaseKind;
using ProtoFeatureTrack = OneMoreTaskTracker.Proto.Features.FeatureTrack;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class PatchFeatureSubStageHandlerTests
{
    public PatchFeatureSubStageHandlerTests() => FeatureMappingConfig.Register();

    private const int ManagerUserId = 41;

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PatchFeatureSubStageHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<PatchFeatureSubStageHandler>.Instance, TestRequestClock.System());

    private static async Task<(int featureId, int subStageId)> CreateFeatureAsync(FeaturesDbContext db)
    {
        var dto = await new CreateFeatureHandler(db, TestRequestClock.System()).Create(
            new CreateFeatureRequest { Title = "Patchy", ManagerUserId = ManagerUserId },
            TestServerCallContext.Create());

        var feature = await db.Features.Include(f => f.SubStages).AsNoTracking().SingleAsync(f => f.Id == dto.Id);
        var sub = feature.SubStages.First(s => s.Track == Track.Backend && s.PhaseKind == PhaseKind.Development);
        return (dto.Id, sub.Id);
    }

    [Fact]
    public async Task Patch_OwnerOnly_AssignsOwner_AndBumpsBothVersions()
    {
        var db = NewDb();
        var (featureId, subStageId) = await CreateFeatureAsync(db);
        var versionBefore = (await db.Features.AsNoTracking().SingleAsync(f => f.Id == featureId)).Version;

        var response = await Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = subStageId,
                CallerUserId = ManagerUserId,
                OwnerUserId = 77,
            },
            TestServerCallContext.Create());

        response.FeatureVersion.Should().Be(versionBefore + 1);
        var sub = response.Taxonomy.SubStages.Single(s => s.Id == subStageId);
        sub.OwnerUserId.Should().Be(77);
        sub.Track.Should().Be(ProtoFeatureTrack.TrackBackend);
        sub.PhaseKind.Should().Be(ProtoFeaturePhaseKind.PhaseKindDevelopment);
    }

    [Fact]
    public async Task Patch_PlannedDates_StoresDates()
    {
        var db = NewDb();
        var (featureId, subStageId) = await CreateFeatureAsync(db);

        var response = await Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = subStageId,
                CallerUserId = ManagerUserId,
                PlannedStart = "2026-05-01",
                PlannedEnd = "2026-05-15",
            },
            TestServerCallContext.Create());

        var sub = response.Taxonomy.SubStages.Single(s => s.Id == subStageId);
        sub.PlannedStart.Should().Be("2026-05-01");
        sub.PlannedEnd.Should().Be("2026-05-15");
    }

    [Fact]
    public async Task Patch_VersionMismatch_ThrowsAlreadyExists()
    {
        var db = NewDb();
        var (featureId, subStageId) = await CreateFeatureAsync(db);

        var act = () => Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = subStageId,
                CallerUserId = ManagerUserId,
                OwnerUserId = 12,
                ExpectedVersion = 99,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
    }

    [Fact]
    public async Task Patch_OverlappingDates_ThrowsFailedPrecondition_WithSubStageOverlap()
    {
        var db = NewDb();
        var (featureId, firstSubStageId) = await CreateFeatureAsync(db);

        var appendResponse = await new AppendFeatureSubStageHandler(db, NullLogger<AppendFeatureSubStageHandler>.Instance, TestRequestClock.System())
            .Append(
                new OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand.AppendFeatureSubStageRequest
                {
                    FeatureId = featureId,
                    CallerUserId = ManagerUserId,
                    Track = "backend",
                    Phase = "development",
                },
                TestServerCallContext.Create());

        await Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = firstSubStageId,
                CallerUserId = ManagerUserId,
                PlannedStart = "2026-05-01",
                PlannedEnd = "2026-05-10",
            },
            TestServerCallContext.Create());

        await Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = appendResponse.CreatedSubStageId,
                CallerUserId = ManagerUserId,
                PlannedStart = "2026-05-20",
                PlannedEnd = "2026-05-25",
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = appendResponse.CreatedSubStageId,
                CallerUserId = ManagerUserId,
                PlannedStart = "2026-05-05",
                PlannedEnd = "2026-05-08",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.FailedPrecondition);
        ex.Which.Status.Detail.Should().Contain("subStageOverlap");
        ex.Which.Status.Detail.Should().Contain("\"neighborOrdinal\":1");
        ex.Which.Status.Detail.Should().Contain("\"track\":\"Backend\"");
        ex.Which.Status.Detail.Should().Contain("\"phase\":\"Development\"");
    }

    [Fact]
    public async Task Patch_AdjacentDates_NoOverlap_Succeeds()
    {
        var db = NewDb();
        var (featureId, firstSubStageId) = await CreateFeatureAsync(db);

        var appendResponse = await new AppendFeatureSubStageHandler(db, NullLogger<AppendFeatureSubStageHandler>.Instance, TestRequestClock.System())
            .Append(
                new OneMoreTaskTracker.Proto.Features.AppendFeatureSubStageCommand.AppendFeatureSubStageRequest
                {
                    FeatureId = featureId,
                    CallerUserId = ManagerUserId,
                    Track = "backend",
                    Phase = "development",
                },
                TestServerCallContext.Create());

        await Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = firstSubStageId,
                CallerUserId = ManagerUserId,
                PlannedStart = "2026-05-01",
                PlannedEnd = "2026-05-10",
            },
            TestServerCallContext.Create());

        var response = await Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = appendResponse.CreatedSubStageId,
                CallerUserId = ManagerUserId,
                PlannedStart = "2026-05-10",
                PlannedEnd = "2026-05-15",
            },
            TestServerCallContext.Create());

        var sub = response.Taxonomy.SubStages.Single(s => s.Id == appendResponse.CreatedSubStageId);
        sub.PlannedStart.Should().Be("2026-05-10");
        sub.PlannedEnd.Should().Be("2026-05-15");
    }

    [Fact]
    public async Task Patch_NonManagerCaller_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var (featureId, subStageId) = await CreateFeatureAsync(db);

        var act = () => Handler(db).Patch(
            new PatchFeatureSubStageRequest
            {
                FeatureId = featureId,
                SubStageId = subStageId,
                CallerUserId = 999,
                OwnerUserId = 12,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }
}
