using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Update;

public sealed class UpdateFeatureTitleHandlerTests
{
    public UpdateFeatureTitleHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static UpdateFeatureTitleHandler Handler(FeaturesDbContext db) =>
        new(db, NullLogger<UpdateFeatureTitleHandler>.Instance);

    [Fact]
    public async Task Update_HappyPath_BumpsTitleAndVersion()
    {
        // Arrange
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "Original", ManagerUserId = 1 },
            TestServerCallContext.Create());

        // Act
        var dto = await Handler(db).Update(
            new UpdateFeatureTitleRequest { Id = created.Id, Title = "Renamed", CallerUserId = 1 },
            TestServerCallContext.Create());

        // Assert
        dto.Title.Should().Be("Renamed");
        dto.Version.Should().Be(created.Version + 1);

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Title.Should().Be("Renamed");
        stored.Version.Should().Be(created.Version + 1);
    }

    [Fact]
    public async Task Update_TrimsTitle()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var dto = await Handler(db).Update(
            new UpdateFeatureTitleRequest { Id = created.Id, Title = "  Renamed  ", CallerUserId = 1 },
            TestServerCallContext.Create());

        dto.Title.Should().Be("Renamed");
    }

    [Fact]
    public async Task Update_EmptyTitle_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateFeatureTitleRequest { Id = created.Id, Title = "   ", CallerUserId = 1 },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_TooLongTitle_ThrowsInvalidArgument()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateFeatureTitleRequest { Id = created.Id, Title = new string('x', 201), CallerUserId = 1 },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Update_UnknownFeatureId_ThrowsNotFound()
    {
        var db = NewDb();

        var act = () => Handler(db).Update(
            new UpdateFeatureTitleRequest { Id = 999, Title = "X", CallerUserId = 1 },
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
            new UpdateFeatureTitleRequest { Id = created.Id, Title = "Pwned", CallerUserId = 6 },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);

        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == created.Id);
        stored.Title.Should().Be("X");
    }

    [Fact]
    public async Task Update_WhenCallerUserIdIsMissing_ThrowsPermissionDenied()
    {
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());

        var act = () => Handler(db).Update(
            new UpdateFeatureTitleRequest { Id = created.Id, Title = "X" /* CallerUserId = 0 */ },
            TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task Update_WithStaleIfMatchVersion_ThrowsAlreadyExists()
    {
        // Arrange: seed a feature then pretend the client still holds version 0
        // after a concurrent bump.
        var db = NewDb();
        var created = await new CreateFeatureHandler(db).Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1 },
            TestServerCallContext.Create());
        await Handler(db).Update(
            new UpdateFeatureTitleRequest { Id = created.Id, Title = "First", CallerUserId = 1 },
            TestServerCallContext.Create());

        // Act: second client sends an expected_version matching the pre-bump state.
        var act = () => Handler(db).Update(
            new UpdateFeatureTitleRequest
            {
                Id = created.Id,
                Title = "Second",
                CallerUserId = 1,
                ExpectedVersion = 0, // <-- stale; actual version is now 1
            },
            TestServerCallContext.Create());

        // Assert: AlreadyExists maps to HTTP 409 via GrpcExceptionMiddleware.
        // We pass a literal `0` sentinel here to bypass the "missing header"
        // branch; Version starts at 1 after the first update.
        // NB: `ExpectedVersion = 0` in proto3 == missing (default); use 99 instead.
        // Correct approach: pass a clearly-stale non-zero value.
        await Task.CompletedTask;
        _ = act;

        var act2 = () => Handler(db).Update(
            new UpdateFeatureTitleRequest
            {
                Id = created.Id,
                Title = "Second",
                CallerUserId = 1,
                ExpectedVersion = 99,
            },
            TestServerCallContext.Create());

        var ex = await act2.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.AlreadyExists);
    }
}
