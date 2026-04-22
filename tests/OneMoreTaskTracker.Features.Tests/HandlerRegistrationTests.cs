using FluentAssertions;
using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Get;
using OneMoreTaskTracker.Features.Features.List;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests;

// Locks in that each of the four feature handlers is wired to its generated
// gRPC base class and that the stubbed RPC returns Unimplemented. Handlers are
// constructed directly (no WebApplicationFactory) because the Features service's
// startup path calls Database.Migrate() against Postgres, which would force a
// live DB dependency into an otherwise hermetic contract test. Specs 03/04 will
// replace the Unimplemented throws with real bodies, at which point these
// assertions will flip to NotImplementedException on the test side and should
// be updated accordingly.
public sealed class HandlerRegistrationTests
{
    [Fact]
    public async Task CreateFeatureHandler_Throws_Unimplemented()
    {
        var handler = new CreateFeatureHandler();

        var act = () => handler.Create(new CreateFeatureRequest(), TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.Unimplemented);
    }

    [Fact]
    public async Task UpdateFeatureHandler_Throws_Unimplemented()
    {
        var handler = new UpdateFeatureHandler();

        var act = () => handler.Update(new UpdateFeatureRequest(), TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.Unimplemented);
    }

    [Fact]
    public async Task ListFeaturesHandler_Throws_Unimplemented()
    {
        var handler = new ListFeaturesHandler();

        var act = () => handler.List(new ListFeaturesRequest(), TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.Unimplemented);
    }

    [Fact]
    public async Task GetFeatureHandler_Throws_Unimplemented()
    {
        var handler = new GetFeatureHandler();

        var act = () => handler.Get(new GetFeatureRequest(), TestServerCallContext.Create());

        var ex = await act.Should().ThrowAsync<RpcException>();
        ex.Which.StatusCode.Should().Be(StatusCode.Unimplemented);
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
