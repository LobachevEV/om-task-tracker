using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureGateCommand;
using Xunit;
using ProtoFeatureGateStatus = OneMoreTaskTracker.Proto.Features.FeatureGateStatus;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class PatchFeatureGateHandlerTests
{
    public PatchFeatureGateHandlerTests() => FeatureMappingConfig.Register();

    private const int ManagerUserId = 11;

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PatchFeatureGateHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<PatchFeatureGateHandler>.Instance, TestRequestClock.System());

    private static async Task<int> CreateFeatureAsync(FeaturesDbContext db)
    {
        var dto = await new CreateFeatureHandler(db, TestRequestClock.System()).Create(
            new CreateFeatureRequest { Title = "Gated", ManagerUserId = ManagerUserId },
            TestServerCallContext.Create());
        return dto.Id;
    }

    [Fact]
    public async Task Patch_Approve_FlipsStatus_StampsApprover_AndBumpsFeatureVersion()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);
        var versionBefore = (await db.Features.AsNoTracking().SingleAsync(f => f.Id == featureId)).Version;

        var response = await Handler(db).Patch(
            new PatchFeatureGateRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                GateKey = FeatureStageLayout.SpecGateKey,
                Status = "approved",
            },
            TestServerCallContext.Create());

        response.FeatureId.Should().Be(featureId);
        response.FeatureVersion.Should().Be(versionBefore + 1);

        var spec = response.Taxonomy.Gates.Single(g => g.GateKey == FeatureStageLayout.SpecGateKey);
        spec.Status.Should().Be(ProtoFeatureGateStatus.GateStatusApproved);
        spec.ApproverUserId.Should().Be(ManagerUserId);
        spec.ApprovedAtUtc.Should().NotBeEmpty();
        spec.RejectionReason.Should().BeEmpty();
    }

    [Fact]
    public async Task Patch_Reject_StoresReason_AndStampsApproverButNotApprovedAt()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var response = await Handler(db).Patch(
            new PatchFeatureGateRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                GateKey = FeatureStageLayout.BackendPrepGateKey,
                Status = "rejected",
                RejectionReason = "Architecture review pending",
            },
            TestServerCallContext.Create());

        var gate = response.Taxonomy.Gates.Single(g => g.GateKey == FeatureStageLayout.BackendPrepGateKey);
        gate.Status.Should().Be(ProtoFeatureGateStatus.GateStatusRejected);
        gate.ApproverUserId.Should().Be(ManagerUserId);
        gate.RejectionReason.Should().Be("Architecture review pending");
        gate.ApprovedAtUtc.Should().BeEmpty();
    }

    [Fact]
    public async Task Patch_NonManagerCaller_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var act = () => Handler(db).Patch(
            new PatchFeatureGateRequest
            {
                FeatureId = featureId,
                CallerUserId = 999,
                GateKey = FeatureStageLayout.SpecGateKey,
                Status = "approved",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Patch_VersionMismatch_ThrowsAlreadyExists()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        var act = () => Handler(db).Patch(
            new PatchFeatureGateRequest
            {
                FeatureId = featureId,
                CallerUserId = ManagerUserId,
                GateKey = FeatureStageLayout.SpecGateKey,
                Status = "approved",
                ExpectedVersion = 99,
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
    }

    [Fact]
    public async Task Patch_UnknownGateKey_ThrowsNotFound()
    {
        var db = NewDb();
        var featureId = await CreateFeatureAsync(db);

        // Bypass validator (handler-level NotFound) by using a key the validator would reject.
        // Use a real key the validator allows but the feature doesn't have — this requires
        // a non-materialized gate key; FeatureStageLayout always materializes all 3 keys,
        // so use a feature with no gates instead.
        var feature = new Feature
        {
            Title = "No gates",
            ManagerUserId = ManagerUserId,
            LeadUserId = ManagerUserId,
            CreatedAt = DateTime.UtcNow,
        };
        feature.Touch(DateTime.UtcNow);
        db.Features.Add(feature);
        await db.SaveChangesAsync();

        var act = () => Handler(db).Patch(
            new PatchFeatureGateRequest
            {
                FeatureId = feature.Id,
                CallerUserId = ManagerUserId,
                GateKey = FeatureStageLayout.SpecGateKey,
                Status = "approved",
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }
}
