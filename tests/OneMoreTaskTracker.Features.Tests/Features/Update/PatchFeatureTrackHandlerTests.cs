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
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class PatchFeatureTrackHandlerTests
{
    public PatchFeatureTrackHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PatchFeatureTrackHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<PatchFeatureTrackHandler>.Instance, TestRequestClock.System());

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
    public async Task Patch_WhenTrackDoesNotExist_CreatesTrackWithSpecifiedOwner()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var result = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 42,
            },
            TestServerCallContext.Create());

        result.TrackOwnerUserId.Should().Be(42);
        result.Kind.Should().Be(FeatureTrackKind.Frontend);
        result.Version.Should().Be(0);
    }

    [Fact]
    public async Task Patch_WhenTrackDoesNotExistAndNoOwnerSpecified_UsesCallerAsOwner()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db, managerUserId: 7);

        var result = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Backend,
                CallerUserId = 7,
            },
            TestServerCallContext.Create());

        result.TrackOwnerUserId.Should().Be(7);
    }

    [Fact]
    public async Task Patch_WhenTrackExistsAndOwnerChanges_UpdatesOwnerAndBumpsVersion()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var created = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 10,
            },
            TestServerCallContext.Create());

        var updated = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 20,
            },
            TestServerCallContext.Create());

        updated.TrackOwnerUserId.Should().Be(20);
        updated.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Patch_WhenNoMutation_ReturnsCurrentSnapshotWithoutBumpingVersion()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var created = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 15,
            },
            TestServerCallContext.Create());

        var noop = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
            },
            TestServerCallContext.Create());

        noop.Version.Should().Be(created.Version);
        noop.TrackOwnerUserId.Should().Be(15);
    }

    [Fact]
    public async Task Patch_WhenSameOwnerSent_TreatsAsNoOpAndDoesNotBumpVersion()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var created = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 15,
            },
            TestServerCallContext.Create());

        var noop = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 15,
            },
            TestServerCallContext.Create());

        noop.Version.Should().Be(created.Version);
    }

    [Fact]
    public async Task Patch_WhenCallerIsNotFeatureManager_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db, managerUserId: 5);

        var act = () => Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 6,
                TrackOwnerUserId = 6,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Patch_WhenCallerUserIdIsZero_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db, managerUserId: 1);

        var act = () => Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                TrackOwnerUserId = 1,
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
            new PatchFeatureTrackRequest
            {
                FeatureId = 999,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 1,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Patch_WithStaleExpectedVersion_ThrowsAlreadyExistsWithConflictMarker()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 10,
            },
            TestServerCallContext.Create());

        await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 20,
            },
            TestServerCallContext.Create());

        var act = () => Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 30,
                ExpectedVersion = 0,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Which.Status.Detail.Should().StartWith("Updated by someone else");
        ex.Which.Status.Detail.Should().Contain("|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"currentVersion\":1");
    }

    [Fact]
    public async Task Patch_WithoutExpectedVersion_SkipsConcurrencyCheck()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 10,
            },
            TestServerCallContext.Create());

        await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 20,
            },
            TestServerCallContext.Create());

        var result = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 30,
            },
            TestServerCallContext.Create());

        result.TrackOwnerUserId.Should().Be(30);
    }

    [Fact]
    public async Task Patch_TwoDifferentKindsOnSameFeature_AreBothPersisted()
    {
        var db = NewDb();
        var feature = await CreateFeatureAsync(db);

        var frontend = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Frontend,
                CallerUserId = 1,
                TrackOwnerUserId = 2,
            },
            TestServerCallContext.Create());

        var backend = await Handler(db).Patch(
            new PatchFeatureTrackRequest
            {
                FeatureId = feature.Id,
                Kind = FeatureTrackKind.Backend,
                CallerUserId = 1,
                TrackOwnerUserId = 3,
            },
            TestServerCallContext.Create());

        frontend.Kind.Should().Be(FeatureTrackKind.Frontend);
        backend.Kind.Should().Be(FeatureTrackKind.Backend);
        frontend.TrackOwnerUserId.Should().Be(2);
        backend.TrackOwnerUserId.Should().Be(3);

        var trackCount = await db.FeatureTracks.CountAsync(t => t.FeatureId == feature.Id);
        trackCount.Should().Be(2);
    }
}
