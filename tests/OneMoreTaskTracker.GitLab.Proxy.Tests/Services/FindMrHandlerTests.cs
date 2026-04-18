using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using OneMoreTaskTracker.GitLab.Proxy.Tests.TestHelpers;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public sealed class FindMrHandlerTests
{
    private static ServerCallContext Context(CancellationToken token = default)
    {
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(token);
        return ctx;
    }

    [Fact]
    public async Task Find_StreamsApiClientResultsAsResponses()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        var mrs = new MrDto?[]
        {
            new() { Iid = 1, ProjectId = 10, Title = "MR one", TargetBranch = "develop" },
            new() { Iid = 2, ProjectId = 20, Title = "MR two", TargetBranch = "master" }
        };
        apiClient.GetMany<MrDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(mrs.ToAsyncEnumerable());

        var responseStream = new ListServerStreamWriter<FindMrResponse>();
        var request = new FindMrRequest { Search = "TASK-1", MrState = "opened" };

        await new FindMrHandler(apiClient).Find(request, responseStream, Context());

        var responses = responseStream.Responses;
        responses.Should().HaveCount(2);
        responses[0].Mr.Iid.Should().Be(1);
        responses[0].Mr.Title.Should().Be("MR one");
        responses[1].Mr.Iid.Should().Be(2);
        responses[1].Mr.TargetBranch.Should().Be("master");
    }

    [Fact]
    public async Task Find_WithEmptyStream_WritesNoResponses()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        apiClient.GetMany<MrDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable.Empty<MrDto?>());

        var responseStream = new ListServerStreamWriter<FindMrResponse>();
        var request = new FindMrRequest { Search = "NONE", MrState = "merged" };

        await new FindMrHandler(apiClient).Find(request, responseStream, Context());

        responseStream.Responses.Should().BeEmpty();
    }

    [Fact]
    public async Task Find_CallsApiClientWithRequestUri()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        Uri? capturedUri = null;
        apiClient.GetMany<MrDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                capturedUri = (Uri)x[0];
                return AsyncEnumerable.Empty<MrDto?>();
            });

        var request = new FindMrRequest { Search = "TASK-42", MrState = "opened" };

        await new FindMrHandler(apiClient).Find(request, new ListServerStreamWriter<FindMrResponse>(), Context());

        capturedUri.Should().NotBeNull();
        capturedUri!.ToString().Should().Contain("search=TASK-42");
        capturedUri.ToString().Should().Contain("state=opened");
    }

    [Fact]
    public async Task Find_ForwardsContextCancellationTokenToApiClient()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        apiClient.GetMany<MrDto>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable.Empty<MrDto?>());

        using var cts = new CancellationTokenSource();
        var request = new FindMrRequest { Search = "TASK-1", MrState = "merged" };

        await new FindMrHandler(apiClient).Find(request, new ListServerStreamWriter<FindMrResponse>(), Context(cts.Token));

        apiClient.Received(1).GetMany<MrDto>(Arg.Any<Uri>(), cts.Token);
    }
}
