using FluentAssertions;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using NSubstitute;
using OneMoreTaskTracker.GitLab.Proxy.Branches;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using OneMoreTaskTracker.GitLab.Proxy.Tests.TestHelpers;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public class CreateBranchHandlerTests
{
    [Fact]
    public async Task Create_WithSuccessfulPost_ReturnsSuccessStatus()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        apiClient.Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns((true, "Created"));

        var request = new CreateBranchRequest
        {
            ProjectId = 123,
            BranchName = "feature/test-branch",
            BaseBranch = "develop"
        };

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>(request);
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(1);
        responses[0].Status.Should().Be(CreateBranchStatus.Success);
    }

    [Fact]
    public async Task Create_WithFailedPost_ReturnsFailStatus()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        apiClient.Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns((false, "Branch already exists"));

        var request = new CreateBranchRequest
        {
            ProjectId = 123,
            BranchName = "feature/existing-branch",
            BaseBranch = "develop"
        };

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>(request);
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(1);
        responses[0].Status.Should().Be(CreateBranchStatus.Fail);
    }

    [Fact]
    public async Task Create_WithMultipleRequests_ProcessesAllRequests()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        apiClient.Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns((true, "Created"));

        var requests = new[]
        {
            new CreateBranchRequest { ProjectId = 123, BranchName = "feature/one", BaseBranch = "develop" },
            new CreateBranchRequest { ProjectId = 123, BranchName = "feature/two", BaseBranch = "develop" },
            new CreateBranchRequest { ProjectId = 456, BranchName = "feature/three", BaseBranch = "master" }
        };

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>(requests);
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(3);
        responses.Should().AllSatisfy(r => r.Status.Should().Be(CreateBranchStatus.Success));
    }

    [Fact]
    public async Task Create_WithMixedSuccessAndFailure_ReturnsCorrectStatuses()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        var callCount = 0;
        apiClient.Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                callCount++;
                return callCount == 2 ? (false, "Conflict") : (true, "Created");
            });

        var requests = new[]
        {
            new CreateBranchRequest { ProjectId = 123, BranchName = "feature/one", BaseBranch = "develop" },
            new CreateBranchRequest { ProjectId = 123, BranchName = "feature/two", BaseBranch = "develop" },
            new CreateBranchRequest { ProjectId = 456, BranchName = "feature/three", BaseBranch = "master" }
        };

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>(requests);
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(3);
        responses[0].Status.Should().Be(CreateBranchStatus.Success);
        responses[1].Status.Should().Be(CreateBranchStatus.Fail);
        responses[2].Status.Should().Be(CreateBranchStatus.Success);
    }

    [Fact]
    public async Task Create_WithEmptyStream_ProducesNoResponses()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>();
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().BeEmpty();
        apiClient.DidNotReceive().Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Create_BuildsCorrectUri()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        var capturedUri = (Uri?)null;
        apiClient.Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                capturedUri = x.Arg<Uri>();
                return (true, "Created");
            });

        var request = new CreateBranchRequest
        {
            ProjectId = 789,
            BranchName = "release/1.0.0",
            BaseBranch = "master"
        };

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>(request);
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        capturedUri.Should().NotBeNull();
        capturedUri!.ToString().Should().Contain("/projects/789/repository/branches");
        capturedUri.ToString().Should().Contain("branch=release%2F1.0.0");
        capturedUri.ToString().Should().Contain("ref=master");
    }

    [Fact]
    public async Task Create_WithSpecialCharactersInBranchName_EncodesProperly()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        var capturedUri = (Uri?)null;
        apiClient.Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                capturedUri = x.Arg<Uri>();
                return (true, "Created");
            });

        var request = new CreateBranchRequest
        {
            ProjectId = 123,
            BranchName = "feature/my-branch-with-slashes/component",
            BaseBranch = "develop"
        };

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>(request);
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        capturedUri.Should().NotBeNull();
        capturedUri!.ToString().Should().Contain("branch=feature%2Fmy-branch-with-slashes%2Fcomponent");
    }

    [Fact]
    public async Task Create_PassesCancellationToken()
    {
        // Arrange
        var logger = Substitute.For<ILogger<CreateBranchHandler>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new CreateBranchHandler(logger, apiClient);

        apiClient.Post(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns((true, "Created"));

        var request = new CreateBranchRequest
        {
            ProjectId = 123,
            BranchName = "feature/test",
            BaseBranch = "develop"
        };

        var requestStream = new QueueAsyncStreamReader<CreateBranchRequest>(request);
        var responseStream = new ListServerStreamWriter<CreateBranchResponse>();
        var cts = new CancellationTokenSource();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(cts.Token);

        // Act
        await handler.Create(requestStream, responseStream, context);

        // Assert
        apiClient.Received(1).Post(
            Arg.Any<Uri>(),
            Arg.Is(cts.Token));
    }
}
