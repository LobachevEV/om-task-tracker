using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class FeatureConcurrencySaverTests
{
    public FeatureConcurrencySaverTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb(string dbName) => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options);

    [Fact]
    public async Task SaveFeatureAsync_WhenNoConflict_PersistsChanges()
    {
        var dbName = Guid.NewGuid().ToString();
        await using var db = NewDb(dbName);
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var feature = await db.Features.Include(f => f.StagePlans).SingleAsync(f => f.Id == created.Id);
        feature.Title = "Renamed";
        feature.Version += 1;

        await FeatureConcurrencySaver.SaveFeatureAsync(db, feature, CancellationToken.None);

        await using var verifyDb = NewDb(dbName);
        var stored = await verifyDb.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Title.Should().Be("Renamed");
    }

    [Fact]
    public async Task SaveFeatureAsync_WhenConcurrentBumpDetected_ThrowsAlreadyExistsAndReloadsCurrentVersion()
    {
        var dbName = Guid.NewGuid().ToString();
        await using var seedDb = NewDb(dbName);
        var created = await new CreateFeatureHandler(seedDb).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        await using var ctxA = NewDb(dbName);
        await using var ctxB = NewDb(dbName);

        var featureA = await ctxA.Features.Include(f => f.StagePlans).SingleAsync(f => f.Id == created.Id);
        var featureB = await ctxB.Features.Include(f => f.StagePlans).SingleAsync(f => f.Id == created.Id);

        featureA.Title = "A-wins";
        featureA.Version += 1;
        await ctxA.SaveChangesAsync();

        featureB.Title = "B-loses";
        featureB.Version += 1;

        var act = () => FeatureConcurrencySaver.SaveFeatureAsync(ctxB, featureB, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Which.Status.Detail.Should().StartWith("Updated by someone else");
        ex.Which.Status.Detail.Should().Contain("|conflict=");
        ex.Which.Status.Detail.Should().Contain("\"kind\":\"version\"");
        ex.Which.Status.Detail.Should().Contain($"\"currentVersion\":{featureA.Version}");
    }

    [Fact]
    public async Task SaveStageAsync_WhenNoConflict_PersistsChanges()
    {
        var dbName = Guid.NewGuid().ToString();
        await using var db = NewDb(dbName);
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var feature = await db.Features.Include(f => f.StagePlans).SingleAsync(f => f.Id == created.Id);
        var plan = feature.StagePlans.First(sp => sp.Stage == (int)FeatureState.Development);
        plan.PerformerUserId = 42;
        plan.Version += 1;

        await FeatureConcurrencySaver.SaveStageAsync(db, plan, CancellationToken.None);

        await using var verifyDb = NewDb(dbName);
        var stored = await verifyDb.FeatureStagePlans.AsNoTracking().SingleAsync(sp => sp.Id == plan.Id);
        stored.PerformerUserId.Should().Be(42);
    }

    [Fact]
    public async Task SaveStageAsync_WhenConcurrentStageBumpDetected_ThrowsAlreadyExistsAndReloadsCurrentVersion()
    {
        var dbName = Guid.NewGuid().ToString();
        await using var seedDb = NewDb(dbName);
        var created = await new CreateFeatureHandler(seedDb).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        await using var ctxA = NewDb(dbName);
        await using var ctxB = NewDb(dbName);

        var planA = await ctxA.FeatureStagePlans.SingleAsync(
            sp => sp.FeatureId == created.Id && sp.Stage == (int)FeatureState.Development);
        var planB = await ctxB.FeatureStagePlans.SingleAsync(
            sp => sp.FeatureId == created.Id && sp.Stage == (int)FeatureState.Development);

        planA.PerformerUserId = 11;
        planA.Version += 1;
        await ctxA.SaveChangesAsync();

        planB.PerformerUserId = 22;
        planB.Version += 1;

        var act = () => FeatureConcurrencySaver.SaveStageAsync(ctxB, planB, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
        ex.Which.Status.Detail.Should().Contain($"\"currentVersion\":{planA.Version}");
    }
}
