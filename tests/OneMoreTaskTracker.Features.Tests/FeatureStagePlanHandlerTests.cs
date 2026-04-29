using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Get;
using OneMoreTaskTracker.Features.Features.List;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class FeatureStagePlanHandlerTests
{
    public FeatureStagePlanHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Create_MaterializesFiveEmptyStagePlansAtomically()
    {
        var db = new FeaturesDbContext(
            new DbContextOptionsBuilder<FeaturesDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);
        var handler = new CreateFeatureHandler(db, TestRequestClock.System());

        var dto = await handler.Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        dto.StagePlans.Should().HaveCount(5);
        dto.StagePlans.Select(sp => sp.Stage).Should().BeEquivalentTo(new[]
        {
            ProtoFeatureState.CsApproving,
            ProtoFeatureState.Development,
            ProtoFeatureState.Testing,
            ProtoFeatureState.EthalonTesting,
            ProtoFeatureState.LiveRelease,
        });
        dto.StagePlans.Should().OnlyContain(sp => sp.PlannedStart == string.Empty);
        dto.StagePlans.Should().OnlyContain(sp => sp.PlannedEnd == string.Empty);
        dto.StagePlans.Should().OnlyContain(sp => sp.PerformerUserId == 0);

        var stored = await db.FeatureStagePlans.AsNoTracking().Where(sp => sp.FeatureId == dto.Id).ToListAsync();
        stored.Should().HaveCount(5);
    }

    [Fact]
    public async Task Get_IncludesFiveStagePlansOrderedByStage()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db, TestRequestClock.System()).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var dto = await new GetFeatureHandler(db).Get(
            new GetFeatureRequest { Id = created.Id },
            TestServerCallContext.Create());

        dto.StagePlans.Should().HaveCount(5);
        dto.StagePlans.Select(sp => (int)sp.Stage).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task List_IncludesFiveStagePlansPerFeature()
    {
        var db = NewDb();
        await new CreateFeatureHandler(db, TestRequestClock.System()).Create(
            new CreateFeatureRequest { Title = "A", ManagerUserId = 1 },
            TestServerCallContext.Create());
        await new CreateFeatureHandler(db, TestRequestClock.System()).Create(
            new CreateFeatureRequest { Title = "B", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var response = await new ListFeaturesHandler(db).List(
            new ListFeaturesRequest(),
            TestServerCallContext.Create());

        response.Features.Should().HaveCount(2);
        response.Features.Should().OnlyContain(f => f.StagePlans.Count == 5);
    }
}
