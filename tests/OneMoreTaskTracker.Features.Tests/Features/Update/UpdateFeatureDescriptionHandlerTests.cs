using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class UpdateFeatureDescriptionHandlerTests
{
    public UpdateFeatureDescriptionHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static UpdateFeatureDescriptionHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<UpdateFeatureDescriptionHandler>.Instance);

    [Fact]
    public async Task Update_HappyPath_SetsDescriptionAndBumpsVersion()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var dto = await Handler(db).Update(
            new UpdateFeatureDescriptionRequest { Id = created.Id, Description = "Plaintext", CallerUserId = 1 },
            TestServerCallContext.Create());

        dto.Description.Should().Be("Plaintext");
        dto.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Update_EmptyString_CoercesToNull()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", Description = "seed", ManagerUserId = 1 },
            TestServerCallContext.Create());

        await Handler(db).Update(
            new UpdateFeatureDescriptionRequest { Id = created.Id, Description = string.Empty, CallerUserId = 1 },
            TestServerCallContext.Create());

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Description.Should().BeNull();
    }

    [Fact]
    public async Task Update_TooLongDescription_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateFeatureDescriptionRequest { Id = created.Id, Description = new string('d', 4001), CallerUserId = 1 },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_UnknownId_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => Handler(db).Update(
            new UpdateFeatureDescriptionRequest { Id = 999, Description = "x", CallerUserId = 1 },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Update_WhenCallerIsNotOwner_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 5 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateFeatureDescriptionRequest { Id = created.Id, Description = "x", CallerUserId = 6 },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }
}
