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

namespace OneMoreTaskTracker.Features.Tests;

// Originally locked in that each of the four feature handlers returned Unimplemented
// (spec 02). Specs 03/04 replaced the Unimplemented throws with real bodies, so these
// tests now assert the minimal observable contract that the handlers are wired to
// their generated gRPC base classes by exercising a trivial error path.
public sealed class HandlerRegistrationTests
{
    public HandlerRegistrationTests() => FeatureMappingConfig.Register();

    private static FeaturesDbContext NewDb() => new(
        new DbContextOptionsBuilder<FeaturesDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task CreateFeatureHandler_RejectsMissingTitle()
    {
        var handler = new CreateFeatureHandler(NewDb());

        var act = () => handler.Create(new CreateFeatureRequest(), TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task UpdateFeatureHandler_ReturnsNotFoundForUnknownId()
    {
        var handler = new UpdateFeatureHandler(NewDb());

        var act = () => handler.Update(new UpdateFeatureRequest { Id = 999, Title = "x" }, TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.NotFound);
    }

    [Fact]
    public async Task ListFeaturesHandler_ReturnsEmptyCollectionByDefault()
    {
        var handler = new ListFeaturesHandler(NewDb());

        var response = await handler.List(new ListFeaturesRequest(), TestServerCallContext.Create());

        response.Features.Should().BeEmpty();
    }

    [Fact]
    public async Task GetFeatureHandler_RejectsMissingId()
    {
        var handler = new GetFeatureHandler(NewDb());

        var act = () => handler.Get(new GetFeatureRequest(), TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.InvalidArgument);
    }
}

internal static class TestServerCallContext
{
    public static ServerCallContext Create() => new FakeServerCallContext();

    private sealed class FakeServerCallContext : ServerCallContext
    {
        protected override string MethodCore => "TestMethod";
        protected override string HostCore => string.Empty;
        protected override string PeerCore => "test";
        protected override DateTime DeadlineCore => DateTime.UtcNow.AddMinutes(1);
        protected override Metadata RequestHeadersCore { get; } = new();
        protected override CancellationToken CancellationTokenCore => CancellationToken.None;
        protected override Metadata ResponseTrailersCore { get; } = new();
        protected override Status StatusCore { get; set; }
        protected override WriteOptions? WriteOptionsCore { get; set; }
        protected override AuthContext AuthContextCore => new("", new Dictionary<string, List<AuthProperty>>());

        protected override ContextPropagationToken CreatePropagationTokenCore(ContextPropagationOptions? options) =>
            throw new NotSupportedException();

        protected override Task WriteResponseHeadersAsyncCore(Metadata responseHeaders) =>
            Task.CompletedTask;
    }
}
