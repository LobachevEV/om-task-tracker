using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class CreateFeatureHandlerTests
{
    public CreateFeatureHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Create_HappyPath_ReturnsDtoWithCsApprovingStateAndLeadDefaultedToManager()
    {
        var handler = new CreateFeatureHandler(NewDb());

        var dto = await handler.Create(
            new CreateFeatureRequest { Title = "Rollout", ManagerUserId = 42 },
            TestServerCallContext.Create());

        dto.Id.Should().BeGreaterThan(0);
        dto.Title.Should().Be("Rollout");
        dto.State.Should().Be(ProtoFeatureState.CsApproving);
        dto.LeadUserId.Should().Be(42);
        dto.ManagerUserId.Should().Be(42);
        dto.Description.Should().BeEmpty();
        dto.PlannedStart.Should().BeEmpty();
        dto.PlannedEnd.Should().BeEmpty();
        dto.CreatedAt.Should().NotBeEmpty();
        dto.UpdatedAt.Should().NotBeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_EmptyOrWhitespaceTitle_ThrowsInvalidArgument(string title)
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = title, ManagerUserId = 1 };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Contain("title");
    }

    [Fact]
    public async Task Create_MissingManagerUserId_ThrowsInvalidArgument()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "X" };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Contain("manager_user_id");
    }

    [Fact]
    public async Task Create_InvalidDateString_ThrowsInvalidArgumentNamingField()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest { Title = "X", ManagerUserId = 1, PlannedStart = "not-a-date" };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Which.Status.Detail.Should().Contain("planned_start");
    }

    [Fact]
    public async Task Create_PlannedEndBeforePlannedStart_ThrowsInvalidArgument()
    {
        var validator = new CreateFeatureRequestValidator();
        var request = new CreateFeatureRequest
        {
            Title = "X",
            ManagerUserId = 1,
            PlannedStart = "2026-05-10",
            PlannedEnd   = "2026-05-01",
        };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Create_EmptyDescription_StoresNullAndReturnsEmptyString()
    {
        var db = NewDb();
        var handler = new CreateFeatureHandler(db);

        var dto = await handler.Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1, Description = "" },
            TestServerCallContext.Create());

        dto.Description.Should().BeEmpty();
        var stored = await db.Features.AsNoTracking().SingleAsync(f => f.Id == dto.Id);
        stored.Description.Should().BeNull();
    }

    [Fact]
    public async Task Create_ExplicitLeadUserId_IsHonoured()
    {
        var handler = new CreateFeatureHandler(NewDb());

        var dto = await handler.Create(
            new CreateFeatureRequest { Title = "X", ManagerUserId = 1, LeadUserId = 7 },
            TestServerCallContext.Create());

        dto.LeadUserId.Should().Be(7);
        dto.ManagerUserId.Should().Be(1);
    }
}
