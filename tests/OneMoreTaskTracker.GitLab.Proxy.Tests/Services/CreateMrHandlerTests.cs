using FluentAssertions;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using NSubstitute;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using OneMoreTaskTracker.GitLab.Proxy.Tests.TestHelpers;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public sealed class CreateMrHandlerTests
{
    private static ServerCallContext NoneContext()
    {
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);
        return ctx;
    }

    [Fact]
    public async Task Create_WithSuccessfulPost_ReturnsSuccessStatus()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        apiClient.Post(Arg.Any<Uri>(), Arg.Any<IReadOnlyDictionary<string, string>?>(), Arg.Any<CancellationToken>())
            .Returns((true, "Created"));
        var handler = new CreateMrHandler(Substitute.For<ILogger<CreateMrHandler>>(), apiClient);

        var requestStream = new QueueAsyncStreamReader<CreateMrRequest>(new CreateMrRequest
        {
            ProjectId = 1, ProjectName = "repo", SourceBranch = "feature/test", TargetBranch = "develop", Title = "Test MR"
        });
        var responseStream = new ListServerStreamWriter<CreateMrResponse>();

        await handler.Create(requestStream, responseStream, NoneContext());

        responseStream.Responses.Should().ContainSingle()
            .Which.Status.Should().Be(CreateMrStatus.Success);
    }

    [Fact]
    public async Task Create_WithFailedPost_ReturnsFailStatus()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        apiClient.Post(Arg.Any<Uri>(), Arg.Any<IReadOnlyDictionary<string, string>?>(), Arg.Any<CancellationToken>())
            .Returns((false, "Conflict"));
        var handler = new CreateMrHandler(Substitute.For<ILogger<CreateMrHandler>>(), apiClient);

        var requestStream = new QueueAsyncStreamReader<CreateMrRequest>(new CreateMrRequest
        {
            ProjectId = 1, ProjectName = "repo", SourceBranch = "feature/test", TargetBranch = "develop", Title = "Test MR"
        });
        var responseStream = new ListServerStreamWriter<CreateMrResponse>();

        await handler.Create(requestStream, responseStream, NoneContext());

        responseStream.Responses.Should().ContainSingle()
            .Which.Status.Should().Be(CreateMrStatus.Fail);
    }

    [Fact]
    public async Task Create_PassesRequestUriAndPostContentToApiClient()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        Uri? capturedUri = null;
        IReadOnlyDictionary<string, string>? capturedContent = null;
        apiClient.Post(Arg.Any<Uri>(), Arg.Any<IReadOnlyDictionary<string, string>?>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                capturedUri = (Uri)x[0];
                capturedContent = (IReadOnlyDictionary<string, string>?)x[1];
                return (true, "OK");
            });
        var handler = new CreateMrHandler(Substitute.For<ILogger<CreateMrHandler>>(), apiClient);

        var requestStream = new QueueAsyncStreamReader<CreateMrRequest>(new CreateMrRequest
        {
            ProjectId = 1, ProjectName = "repo", SourceBranch = "feature/test", TargetBranch = "master", Title = "Test MR"
        });

        await handler.Create(requestStream, new ListServerStreamWriter<CreateMrResponse>(), NoneContext());

        capturedUri!.ToString().Should().Be("projects/1/merge_requests");
        capturedContent!["labels"].Should().Be("release");
        capturedContent["source_branch"].Should().Be("feature/test");
    }

    [Fact]
    public async Task Create_ProcessesMultipleRequests_InOrder()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        apiClient.Post(Arg.Any<Uri>(), Arg.Any<IReadOnlyDictionary<string, string>?>(), Arg.Any<CancellationToken>())
            .Returns((true, "OK"), (false, "Fail"), (true, "OK"));
        var handler = new CreateMrHandler(Substitute.For<ILogger<CreateMrHandler>>(), apiClient);

        static CreateMrRequest Req() => new()
        {
            ProjectId = 1, ProjectName = "repo", SourceBranch = "s", TargetBranch = "develop", Title = "t"
        };
        var requestStream = new QueueAsyncStreamReader<CreateMrRequest>(Req(), Req(), Req());
        var responseStream = new ListServerStreamWriter<CreateMrResponse>();

        await handler.Create(requestStream, responseStream, NoneContext());

        responseStream.Responses.Select(r => r.Status).Should().Equal(
            CreateMrStatus.Success, CreateMrStatus.Fail, CreateMrStatus.Success);
    }

    [Fact]
    public async Task Create_WithNoRequests_WritesNoResponses()
    {
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateMrHandler(Substitute.For<ILogger<CreateMrHandler>>(), apiClient);

        var responseStream = new ListServerStreamWriter<CreateMrResponse>();

        await handler.Create(new QueueAsyncStreamReader<CreateMrRequest>(), responseStream, NoneContext());

        responseStream.Responses.Should().BeEmpty();
        await apiClient.DidNotReceive().Post(
            Arg.Any<Uri>(),
            Arg.Any<IReadOnlyDictionary<string, string>?>(),
            Arg.Any<CancellationToken>());
    }
}
