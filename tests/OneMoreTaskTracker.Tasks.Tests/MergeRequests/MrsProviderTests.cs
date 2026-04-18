using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Proto.Clients.MergeRequests;
using OneMoreTaskTracker.Tasks.MergeRequests;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.MergeRequests;

public sealed class MrsProviderTests
{
    [Fact]
    public async System.Threading.Tasks.Task Find_ForwardsMrFinderCall_WithSearchAndState()
    {
        var client = Substitute.For<MrFinder.MrFinderClient>();
        var mrs = new[]
        {
            new MrDto { Iid = 1, ProjectId = 10, ProjectName = "repo-1", Title = "Feature 1" },
            new MrDto { Iid = 2, ProjectId = 20, ProjectName = "repo-2", Title = "Feature 2" }
        };
        var responses = mrs.Select(mr => new FindMrResponse { Mr = mr }).ToList();

        var call = CreateMockAsyncStreamingCall(responses);
        client.Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(call);

        var provider = new MrsProvider(client);
        var result = await provider.Find("TASK-123", "merged").ToListAsync();

        result.Should().HaveCount(2);
        result[0].Iid.Should().Be(1);
        result[1].Iid.Should().Be(2);

        client.Received(1).Find(Arg.Is<FindMrRequest>(req =>
            req.Search == "TASK-123" && req.MrState == "merged"),
            headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>());
    }

    [Fact]
    public async System.Threading.Tasks.Task Find_ReturnsEmptySequence_WhenNoMrsFound()
    {
        var client = Substitute.For<MrFinder.MrFinderClient>();
        var call = CreateMockAsyncStreamingCall(new List<FindMrResponse>());

        client.Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(call);

        var provider = new MrsProvider(client);
        var result = await provider.Find("TASK-999", "opened").ToListAsync();

        result.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task Find_TranslatesGrpcResponsesToDomainModels()
    {
        var client = Substitute.For<MrFinder.MrFinderClient>();
        var mr = new MrDto
        {
            Iid = 42,
            ProjectId = 100,
            ProjectName = "my-project",
            Title = "Implement feature X",
            SourceBranch = "feature/x",
            TargetBranch = "release",
            Labels = { "feature", "review" }
        };
        var responses = new[] { new FindMrResponse { Mr = mr } };

        var call = CreateMockAsyncStreamingCall(responses);
        client.Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(call);

        var provider = new MrsProvider(client);
        var result = await provider.Find("TASK-1", "merged").ToListAsync();

        result.Should().HaveCount(1);
        var resultMr = result[0];
        resultMr.Iid.Should().Be(42);
        resultMr.ProjectId.Should().Be(100);
        resultMr.ProjectName.Should().Be("my-project");
        resultMr.Title.Should().Be("Implement feature X");
        resultMr.SourceBranch.Should().Be("feature/x");
        resultMr.TargetBranch.Should().Be("release");
        resultMr.Labels.Should().BeEquivalentTo("feature", "review");
    }

    [Fact]
    public async System.Threading.Tasks.Task Find_PassesCancellationTokenToClient()
    {
        var client = Substitute.For<MrFinder.MrFinderClient>();
        var call = CreateMockAsyncStreamingCall(new List<FindMrResponse>());

        client.Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(call);

        var provider = new MrsProvider(client);
        var cts = new CancellationTokenSource();

        await provider.Find("TASK-1", "merged", cts.Token).ToListAsync();

        client.Received(1).Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: cts.Token);
    }

    [Fact]
    public async System.Threading.Tasks.Task Find_ThrowsRpcException_OnStreamError()
    {
        var client = Substitute.For<MrFinder.MrFinderClient>();
        var rpcException = new RpcException(new Status(StatusCode.Internal, "Stream error"));

        var enumerable = ThrowingAsyncEnumerable<FindMrResponse>(rpcException);
        var mockStream = new MockAsyncStreamReader(enumerable);

        var call = new AsyncServerStreamingCall<FindMrResponse>(
            mockStream,
            Task.FromResult(new Metadata()),
            () => Status.DefaultSuccess,
            () => new Metadata(),
            () => { });

        client.Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(call);

        var provider = new MrsProvider(client);

        var act = async () => await provider.Find("TASK-1", "merged").ToListAsync();

        await act.Should().ThrowAsync<RpcException>();
    }

    [Fact]
    public async System.Threading.Tasks.Task Find_HandlesMultipleStreamedResponses_InOrder()
    {
        var client = Substitute.For<MrFinder.MrFinderClient>();
        var responses = new[]
        {
            new FindMrResponse { Mr = new MrDto { Iid = 1, Title = "First" } },
            new FindMrResponse { Mr = new MrDto { Iid = 2, Title = "Second" } },
            new FindMrResponse { Mr = new MrDto { Iid = 3, Title = "Third" } }
        };

        var call = CreateMockAsyncStreamingCall(responses);
        client.Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(call);

        var provider = new MrsProvider(client);
        var result = await provider.Find("TASK-1", "merged").ToListAsync();

        result.Should().HaveCount(3);
        result.Select(mr => mr.Iid).Should().ContainInOrder(1, 2, 3);
        result.Select(mr => mr.Title).Should().ContainInOrder("First", "Second", "Third");
    }

    [Fact]
    public async System.Threading.Tasks.Task Find_FilterAndMapsMrsCorrectly_ByState()
    {
        var client = Substitute.For<MrFinder.MrFinderClient>();
        var responses = new[]
        {
            new FindMrResponse { Mr = new MrDto { Iid = 1, TargetBranch = "release" } },
            new FindMrResponse { Mr = new MrDto { Iid = 2, TargetBranch = "master" } }
        };

        var call = CreateMockAsyncStreamingCall(responses);
        client.Find(Arg.Any<FindMrRequest>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(call);

        var provider = new MrsProvider(client);
        await provider.Find("TEST", "merged").ToListAsync();

        client.Received(1).Find(
            Arg.Is<FindMrRequest>(r => r.MrState == "merged"),
            headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>());
    }

    private class MockAsyncStreamReader(IAsyncEnumerable<FindMrResponse> enumerable) : IAsyncStreamReader<FindMrResponse>
    {
        private readonly IAsyncEnumerator<FindMrResponse> _enumerator = enumerable.GetAsyncEnumerator();

        public FindMrResponse Current => _enumerator.Current;

        public async Task<bool> MoveNext(CancellationToken cancellationToken)
        {
            return await _enumerator.MoveNextAsync();
        }

        public void Dispose()
        {
            _enumerator.DisposeAsync().AsTask().GetAwaiter().GetResult();
        }
    }

    private static AsyncServerStreamingCall<FindMrResponse> CreateMockAsyncStreamingCall(
        IEnumerable<FindMrResponse> responses)
    {
        var enumerable = ToAsyncEnumerable(responses);
        var mockStream = new MockAsyncStreamReader(enumerable);

        return new AsyncServerStreamingCall<FindMrResponse>(
            mockStream,
            Task.FromResult(new Metadata()),
            () => Status.DefaultSuccess,
            () => new Metadata(),
            () => { });
    }

    private static async IAsyncEnumerable<T> ToAsyncEnumerable<T>(IEnumerable<T> items)
    {
        foreach (var item in items)
            yield return item;
        await System.Threading.Tasks.Task.CompletedTask;
    }

    private static async IAsyncEnumerable<T> ThrowingAsyncEnumerable<T>(Exception ex)
    {
        await System.Threading.Tasks.Task.CompletedTask;
        throw ex;
        yield break;
    }
}
