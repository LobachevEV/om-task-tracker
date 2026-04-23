using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Get;
using OneMoreTaskTracker.Features.Features.List;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;
using ProtoFeatureStagePlan = OneMoreTaskTracker.Proto.Features.FeatureStagePlan;

namespace OneMoreTaskTracker.Features.Tests;

// Behavior coverage for the per-stage planning invariants introduced in this
// feature: 5-row materialization on create, exactly-5 enforcement on update,
// per-row date validation, performer coercion, derived-date recomputation,
// stage-plan fan-out on every read path.
public sealed class FeatureStagePlanHandlerTests
{
    public FeatureStagePlanHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static ProtoFeatureStagePlan Plan(
        ProtoFeatureState stage,
        string? start = null,
        string? end = null,
        int performerUserId = 0) =>
        new()
        {
            Stage           = stage,
            PlannedStart    = start ?? string.Empty,
            PlannedEnd      = end ?? string.Empty,
            PerformerUserId = performerUserId,
        };

    private static IReadOnlyList<ProtoFeatureStagePlan> FiveEmpty() =>
    [
        Plan(ProtoFeatureState.CsApproving),
        Plan(ProtoFeatureState.Development),
        Plan(ProtoFeatureState.Testing),
        Plan(ProtoFeatureState.EthalonTesting),
        Plan(ProtoFeatureState.LiveRelease),
    ];

    [Fact]
    public async Task Create_MaterializesFiveEmptyStagePlansAtomically()
    {
        var db = new FeaturesDbContext(
            new DbContextOptionsBuilder<FeaturesDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);
        var handler = new CreateFeatureHandler(db);

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
    public async Task Update_WithFiveStagePlans_UpsertsAndRecomputesFeatureDates()
    {
        var db = NewDb();
        var creator = new CreateFeatureHandler(db);
        var updater = new UpdateFeatureHandler(db);

        var created = await creator.Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var request = new UpdateFeatureRequest
        {
            Id    = created.Id,
            Title = "X",
            State = ProtoFeatureState.Development,
            StagePlans =
            {
                Plan(ProtoFeatureState.CsApproving,    "2026-05-01", "2026-05-10", 4),
                Plan(ProtoFeatureState.Development,    "2026-05-10", "2026-06-01", 2),
                Plan(ProtoFeatureState.Testing,        performerUserId: 3),
                Plan(ProtoFeatureState.EthalonTesting, "2026-06-05", "2026-06-10", 6),
                Plan(ProtoFeatureState.LiveRelease,    "2026-06-12", "2026-06-15", 1),
            }
        };

        var updated = await updater.Update(request, TestServerCallContext.Create());

        updated.StagePlans.Should().HaveCount(5);
        updated.PlannedStart.Should().Be("2026-05-01", "min over populated starts");
        updated.PlannedEnd.Should().Be("2026-06-15",   "max over populated ends");

        var testingRow = updated.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Testing);
        testingRow.PlannedStart.Should().BeEmpty();
        testingRow.PlannedEnd.Should().BeEmpty();
        testingRow.PerformerUserId.Should().Be(3);
    }

    [Fact]
    public async Task Update_ZeroStagePlans_LeavesExistingStagePlansUntouched()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Seed some state via a first update so we have something to protect
        await new UpdateFeatureHandler(db).Update(
            new UpdateFeatureRequest
            {
                Id    = created.Id,
                Title = "X",
                State = ProtoFeatureState.Development,
                StagePlans =
                {
                    Plan(ProtoFeatureState.CsApproving,    "2026-05-01", "2026-05-10", 4),
                    Plan(ProtoFeatureState.Development,    "2026-05-10", "2026-06-01", 2),
                    Plan(ProtoFeatureState.Testing),
                    Plan(ProtoFeatureState.EthalonTesting, "2026-06-05", "2026-06-10", 6),
                    Plan(ProtoFeatureState.LiveRelease,    "2026-06-12", "2026-06-15", 1),
                }
            }, TestServerCallContext.Create());

        var updated = await new UpdateFeatureHandler(db).Update(
            new UpdateFeatureRequest
            {
                Id    = created.Id,
                Title = "Renamed",
                State = ProtoFeatureState.Development,
            },
            TestServerCallContext.Create());

        updated.Title.Should().Be("Renamed");
        updated.StagePlans.Should().HaveCount(5);
        updated.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.Development).PerformerUserId.Should().Be(2);
    }

    [Fact]
    public async Task Update_WrongCount_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var request = new UpdateFeatureRequest
        {
            Id = created.Id,
            Title = "X",
            State = ProtoFeatureState.Development,
            StagePlans =
            {
                Plan(ProtoFeatureState.CsApproving),
                Plan(ProtoFeatureState.Development),
                Plan(ProtoFeatureState.Testing),
            }
        };

        var act = () => new UpdateFeatureHandler(db).Update(request, TestServerCallContext.Create());
        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_DuplicateStageOrdinal_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var request = new UpdateFeatureRequest
        {
            Id = created.Id,
            Title = "X",
            State = ProtoFeatureState.Development,
            StagePlans =
            {
                Plan(ProtoFeatureState.CsApproving),
                Plan(ProtoFeatureState.Development),
                Plan(ProtoFeatureState.Development), // duplicate
                Plan(ProtoFeatureState.EthalonTesting),
                Plan(ProtoFeatureState.LiveRelease),
            }
        };

        var act = () => new UpdateFeatureHandler(db).Update(request, TestServerCallContext.Create());
        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_PerRowDateOrderViolation_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var request = new UpdateFeatureRequest
        {
            Id = created.Id,
            Title = "X",
            State = ProtoFeatureState.Development,
            StagePlans =
            {
                Plan(ProtoFeatureState.CsApproving,    "2026-05-10", "2026-05-01"), // inverted
                Plan(ProtoFeatureState.Development),
                Plan(ProtoFeatureState.Testing),
                Plan(ProtoFeatureState.EthalonTesting),
                Plan(ProtoFeatureState.LiveRelease),
            }
        };

        var act = () => new UpdateFeatureHandler(db).Update(request, TestServerCallContext.Create());
        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_AllStagePlanDatesNull_SetsFeatureDatesToNull()
    {
        var db = NewDb();
        var creator = new CreateFeatureHandler(db);
        var created = await creator.Create(
            new CreateFeatureRequest
            {
                Title = "X",
                ManagerUserId = 1,
                PlannedStart = "2026-05-01",
                PlannedEnd   = "2026-05-10",
            }, TestServerCallContext.Create());

        created.PlannedStart.Should().Be("2026-05-01");

        var updater = new UpdateFeatureHandler(db);
        var updated = await updater.Update(
            new UpdateFeatureRequest
            {
                Id = created.Id,
                Title = "X",
                State = ProtoFeatureState.Development,
                StagePlans =
                {
                    FiveEmpty()[0], FiveEmpty()[1], FiveEmpty()[2], FiveEmpty()[3], FiveEmpty()[4],
                }
            }, TestServerCallContext.Create());

        updated.PlannedStart.Should().BeEmpty();
        updated.PlannedEnd.Should().BeEmpty();
    }

    [Fact]
    public async Task Update_NegativePerformerUserId_CoercesToZero()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var request = new UpdateFeatureRequest
        {
            Id = created.Id,
            Title = "X",
            State = ProtoFeatureState.Development,
            StagePlans =
            {
                Plan(ProtoFeatureState.CsApproving,    performerUserId: -5),
                Plan(ProtoFeatureState.Development),
                Plan(ProtoFeatureState.Testing),
                Plan(ProtoFeatureState.EthalonTesting),
                Plan(ProtoFeatureState.LiveRelease),
            }
        };

        var updated = await new UpdateFeatureHandler(db).Update(request, TestServerCallContext.Create());
        updated.StagePlans.Single(sp => sp.Stage == ProtoFeatureState.CsApproving).PerformerUserId.Should().Be(0);
    }

    [Fact]
    public async Task Get_IncludesFiveStagePlansOrderedByStage()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
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
        await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "A", ManagerUserId = 1 },
            TestServerCallContext.Create());
        await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "B", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var response = await new ListFeaturesHandler(db).List(
            new ListFeaturesRequest(),
            TestServerCallContext.Create());

        response.Features.Should().HaveCount(2);
        response.Features.Should().OnlyContain(f => f.StagePlans.Count == 5);
    }
}
