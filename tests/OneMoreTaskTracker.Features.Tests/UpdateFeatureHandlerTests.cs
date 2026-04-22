using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class UpdateFeatureHandlerTests
{
    public UpdateFeatureHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Update_NonExistentId_ThrowsNotFound()
    {
        var handler = new UpdateFeatureHandler(NewDb());

        var act = () => handler.Update(
            new UpdateFeatureRequest { Id = 999, Title = "X", State = ProtoFeatureState.Development },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesFieldsAndBumpsUpdatedAt()
    {
        var db = NewDb();
        var creator = new CreateFeatureHandler(db);
        var updater = new UpdateFeatureHandler(db);

        var created = await creator.Create(
            new CreateFeatureRequest { Title = "Initial", ManagerUserId = 5 },
            TestServerCallContext.Create());

        // Ensure the clock advances for UpdatedAt > CreatedAt
        await Task.Delay(20);

        var updated = await updater.Update(
            new UpdateFeatureRequest
            {
                Id            = created.Id,
                Title         = "Updated",
                State         = ProtoFeatureState.Development,
                PlannedStart  = "2026-05-01",
                PlannedEnd    = "2026-05-15",
                LeadUserId    = 8,
            },
            TestServerCallContext.Create());

        updated.Id.Should().Be(created.Id);
        updated.Title.Should().Be("Updated");
        updated.State.Should().Be(ProtoFeatureState.Development);
        updated.PlannedStart.Should().Be("2026-05-01");
        updated.PlannedEnd.Should().Be("2026-05-15");
        updated.LeadUserId.Should().Be(8);

        var createdAt = DateTime.Parse(updated.CreatedAt, System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.RoundtripKind);
        var updatedAt = DateTime.Parse(updated.UpdatedAt, System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.RoundtripKind);
        updatedAt.Should().BeAfter(createdAt);
    }

    [Fact]
    public async Task Update_OutOfRangeState_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());
        var updater = new UpdateFeatureHandler(db);

        var act = () => updater.Update(
            new UpdateFeatureRequest
            {
                Id    = created.Id,
                Title = "X",
                State = (ProtoFeatureState)99, // unknown enum value from the wire
            },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_DoesNotMutateManagerUserId()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 42 },
            TestServerCallContext.Create());
        var updater = new UpdateFeatureHandler(db);

        // UpdateFeatureRequest intentionally has no manager_user_id field (spec 02/03);
        // we verify the stored manager remains 42 after an update.
        var updated = await updater.Update(
            new UpdateFeatureRequest
            {
                Id    = created.Id,
                Title = "X2",
                State = ProtoFeatureState.Development,
            },
            TestServerCallContext.Create());

        updated.ManagerUserId.Should().Be(42);
        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.ManagerUserId.Should().Be(42);
    }
}
