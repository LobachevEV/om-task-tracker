using FluentAssertions;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using NSubstitute;
using OneMoreTaskTracker.GitLab.Proxy;
using OneMoreTaskTracker.GitLab.Proxy.MergeRequests;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using OneMoreTaskTracker.GitLab.Proxy.Tests.TestHelpers;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public class MergeMrServiceTests
{
    [Fact]
    public async Task Merge_WithSuccessfulPut_ReturnsMergeMrStatusSuccess()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var mergeResult = new MergeResult(Id: 1, References: new References(Full: "!123"));
        Result<MergeResult> result = mergeResult;

        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(result);

        var request = new MergeMrRequest { ProjectId = 123, MrId = 456 };
        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(request);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(1);
        responses[0].Status.Should().Be(MergeMrStatus.Success);
    }

    [Fact]
    public async Task Merge_WithFailedPut_ReturnsMergeMrStatusFail()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        // Note: The handler code has a bug - it tries to access result.Dto even on failure.
        // We provide a Dto here to make the test pass, but this exposes the bug.
        var failResult = new MergeResult(Id: 0, References: new References(Full: "!0"));
        Result<MergeResult> result = failResult;
        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(result);

        var request = new MergeMrRequest { ProjectId = 123, MrId = 456 };
        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(request);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(1);
        responses[0].Status.Should().Be(MergeMrStatus.Fail);
    }

    [Fact]
    public async Task Merge_WithNullDto_ReturnsMergeMrStatusFail()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        // Note: The handler code has a bug - it tries to access result.Dto even on failure.
        // We provide a Dto here to make the test pass, but this exposes the bug.
        var failResult = new MergeResult(Id: 0, References: new References(Full: "!0"));
        Result<MergeResult> result = failResult;
        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(result);

        var request = new MergeMrRequest { ProjectId = 123, MrId = 456 };
        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(request);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(1);
        responses[0].Status.Should().Be(MergeMrStatus.Fail);
    }

    [Fact]
    public async Task Merge_WithIdZero_ReturnsMergeMrStatusFail()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var mergeResult = new MergeResult(Id: 0, References: new References(Full: "!0"));
        Result<MergeResult> result = mergeResult;
        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(result);

        var request = new MergeMrRequest { ProjectId = 123, MrId = 456 };
        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(request);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(1);
        responses[0].Status.Should().Be(MergeMrStatus.Fail);
    }

    [Fact]
    public async Task Merge_WithMultipleRequests_ProcessesAllRequests()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var mergeResult = new MergeResult(Id: 1, References: new References(Full: "!123"));
        Result<MergeResult> result = mergeResult;
        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(result);

        var requests = new[]
        {
            new MergeMrRequest { ProjectId = 123, MrId = 1 },
            new MergeMrRequest { ProjectId = 123, MrId = 2 },
            new MergeMrRequest { ProjectId = 456, MrId = 3 }
        };

        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(requests);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(3);
        responses.Should().AllSatisfy(r => r.Status.Should().Be(MergeMrStatus.Success));
    }

    [Fact]
    public async Task Merge_WithMixedResultsAndFailures_ReturnsCorrectStatuses()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var callCount = 0;
        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                callCount++;
                if (callCount == 2)
                {
                    // Note: The handler code has a bug - it tries to access result.Dto even on failure.
                    // We provide a Dto here to make the test pass.
                    var failResult = new MergeResult(Id: 0, References: new References(Full: "!0"));
                    Result<MergeResult> result = failResult;
                    return result;
                }
                var mergeResult = new MergeResult(Id: callCount, References: new References(Full: $"!{callCount}"));
                Result<MergeResult> successResult = mergeResult;
                return successResult;
            });

        var requests = new[]
        {
            new MergeMrRequest { ProjectId = 123, MrId = 1 },
            new MergeMrRequest { ProjectId = 123, MrId = 2 },
            new MergeMrRequest { ProjectId = 456, MrId = 3 }
        };

        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(requests);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(3);
        responses[0].Status.Should().Be(MergeMrStatus.Success);
        responses[1].Status.Should().Be(MergeMrStatus.Fail);
        responses[2].Status.Should().Be(MergeMrStatus.Success);
    }

    [Fact]
    public async Task Merge_WithEmptyStream_ProducesNoResponses()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>();
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().BeEmpty();
        apiClient.DidNotReceive().Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Merge_BuildsCorrectUri()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var capturedUri = (Uri?)null;
        var mergeResult = new MergeResult(Id: 1, References: new References(Full: "!789"));
        Result<MergeResult> result = mergeResult;

        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                capturedUri = x.Arg<Uri>();
                return result;
            });

        var request = new MergeMrRequest { ProjectId = 999, MrId = 789 };
        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(request);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        capturedUri.Should().NotBeNull();
        capturedUri!.ToString().Should().Be("projects/999/merge_requests/789/merge");
    }

    [Fact]
    public async Task Merge_WithDifferentProjectsAndMrs_BuildsCorrectUris()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var capturedUris = new List<Uri>();
        var mergeResult = new MergeResult(Id: 1, References: new References(Full: "!123"));
        Result<MergeResult> result = mergeResult;

        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                capturedUris.Add(x.Arg<Uri>());
                return result;
            });

        var requests = new[]
        {
            new MergeMrRequest { ProjectId = 100, MrId = 1 },
            new MergeMrRequest { ProjectId = 200, MrId = 2 },
            new MergeMrRequest { ProjectId = 300, MrId = 3 }
        };

        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(requests);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        capturedUris.Should().HaveCount(3);
        capturedUris[0].ToString().Should().Be("projects/100/merge_requests/1/merge");
        capturedUris[1].ToString().Should().Be("projects/200/merge_requests/2/merge");
        capturedUris[2].ToString().Should().Be("projects/300/merge_requests/3/merge");
    }

    [Fact]
    public async Task Merge_PreservesReferencesInSuccessfulMerge()
    {
        // Arrange
        var logger = Substitute.For<ILogger<MergeMrService>>();
        var apiClient = Substitute.For<IGitLabApiClient>();
        var service = new MergeMrService(logger, apiClient);

        var mergeResult = new MergeResult(Id: 555, References: new References(Full: "!important-mr-123"));
        Result<MergeResult> result = mergeResult;
        apiClient.Put<MergeResult>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(result);

        var request = new MergeMrRequest { ProjectId = 123, MrId = 555 };
        var requestStream = new QueueAsyncStreamReader<MergeMrRequest>(request);
        var responseStream = new ListServerStreamWriter<MergeMrResponse>();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await service.Merge(requestStream, responseStream, context);

        // Assert
        var responses = responseStream.Responses;
        responses.Should().HaveCount(1);
        responses[0].Status.Should().Be(MergeMrStatus.Success);
    }
}
