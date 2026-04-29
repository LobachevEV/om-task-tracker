using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Get;
using OneMoreTaskTracker.Features.Tests.TestHelpers;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using Xunit;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Tests;

public sealed class GetFeatureHandlerTests
{
    public GetFeatureHandlerTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Get_IdZero_ThrowsInvalidArgument()
    {
        var validator = new GetFeatureRequestValidator();
        var request = new GetFeatureRequest { Id = 0 };

        var act = () => ValidationPipeline.ValidateAsync(validator, request);

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Get_MissingId_ThrowsNotFound()
    {
        var handler = new GetFeatureHandler(NewDb());

        var act = () => handler.Get(new GetFeatureRequest { Id = 999 }, TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task Get_ExistingId_ReturnsDtoWithRoundTrippedFields()
    {
        var db = NewDb();
        var feature = new Feature
        {
            Title         = "Rollout",
            Description   = "detail",
            State         = (int)FeatureState.Development,
            PlannedStart  = new DateOnly(2026, 5, 1),
            PlannedEnd    = new DateOnly(2026, 5, 10),
            ManagerUserId = 1,
            LeadUserId    = 2,
            CreatedAt     = DateTime.UtcNow,
        };
        feature.Touch(DateTime.UtcNow);
        db.Features.Add(feature);
        await db.SaveChangesAsync();

        var handler = new GetFeatureHandler(db);
        var dto = await handler.Get(new GetFeatureRequest { Id = feature.Id }, TestServerCallContext.Create());

        dto.Id.Should().Be(feature.Id);
        dto.Title.Should().Be("Rollout");
        dto.Description.Should().Be("detail");
        dto.State.Should().Be(ProtoFeatureState.Development);
        dto.PlannedStart.Should().Be("2026-05-01");
        dto.PlannedEnd.Should().Be("2026-05-10");
        dto.ManagerUserId.Should().Be(1);
        dto.LeadUserId.Should().Be(2);
        dto.CreatedAt.Should().NotBeEmpty();
        dto.UpdatedAt.Should().NotBeEmpty();
    }
}
