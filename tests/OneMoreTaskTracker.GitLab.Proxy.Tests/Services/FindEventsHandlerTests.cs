using FluentAssertions;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.GitLab.Proxy.Events;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests.Services;

public class FindEventsHandlerTests
{
    private sealed class TestServerStreamWriter : IServerStreamWriter<FindEventsResponse>
    {
        private readonly List<FindEventsResponse> _responses = [];

        public WriteOptions? WriteOptions { get; set; }

        public async Task WriteAsync(FindEventsResponse message)
        {
            _responses.Add(message);
            await Task.CompletedTask;
        }

        public IReadOnlyList<FindEventsResponse> GetResponses() => _responses.AsReadOnly();
    }

    [Fact]
    public async Task Find_WithMatchingEvents_StreamsFilteredEvents()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new FindEventsHandler(apiClient);

        var gitlabEvents = new[]
        {
            new GitlabEvent(
                ProjectId: 123,
                PushData: new PushData(Action: "created", Ref: "TEST-001/dev")),
            new GitlabEvent(
                ProjectId: 456,
                PushData: new PushData(Action: "created", Ref: "TEST-001/dev"))
        };

        apiClient.GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(
                gitlabEvents.Cast<GitlabEvent?>().ToAsyncEnumerable(),
                AsyncEnumerable.Empty<GitlabEvent?>());

        var request = new FindEventsRequest
        {
            UserId = 1,
            TaskId = "TEST-001",
            SearchAfter = Timestamp.FromDateTime(new System.DateTime(2024, 1, 1, 0, 0, 0, System.DateTimeKind.Utc))
        };
        var responseStream = new TestServerStreamWriter();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Find(request, responseStream, context);

        // Assert
        var responses = responseStream.GetResponses();
        responses.Should().HaveCount(2);
        responses[0].Event.TaskName.Should().Be("TEST-001");
        responses[0].Event.ProjectId.Should().Be(123);
        responses[1].Event.ProjectId.Should().Be(456);
    }

    [Fact]
    public async Task Find_FiltersByBranch_ExcludesNonMatchingTaskId()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new FindEventsHandler(apiClient);

        var gitlabEvents = new[]
        {
            new GitlabEvent(
                ProjectId: 123,
                PushData: new PushData(Action: "created", Ref: "TEST-001/dev")),
            new GitlabEvent(
                ProjectId: 456,
                PushData: new PushData(Action: "created", Ref: "TEST-002/dev")),
            new GitlabEvent(
                ProjectId: 789,
                PushData: new PushData(Action: "created", Ref: "TEST-001/test"))
        };

        apiClient.GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(
                gitlabEvents.Cast<GitlabEvent?>().ToAsyncEnumerable(),
                AsyncEnumerable.Empty<GitlabEvent?>());

        var request = new FindEventsRequest
        {
            UserId = 1,
            TaskId = "TEST-001",
            SearchAfter = Timestamp.FromDateTime(new System.DateTime(2024, 1, 1, 0, 0, 0, System.DateTimeKind.Utc))
        };
        var responseStream = new TestServerStreamWriter();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Find(request, responseStream, context);

        // Assert
        var responses = responseStream.GetResponses();
        responses.Should().HaveCount(1);
        responses[0].Event.ProjectId.Should().Be(123);
        responses[0].Event.Branch.Should().Be("TEST-001/dev");
    }

    [Fact]
    public async Task Find_FiltersByTaskStage_ExcludesNonDevStages()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new FindEventsHandler(apiClient);

        var gitlabEvents = new[]
        {
            new GitlabEvent(
                ProjectId: 123,
                PushData: new PushData(Action: "created", Ref: "TEST-001/dev")),
            new GitlabEvent(
                ProjectId: 456,
                PushData: new PushData(Action: "created", Ref: "TEST-001/release")),
            new GitlabEvent(
                ProjectId: 789,
                PushData: new PushData(Action: "created", Ref: "TEST-001/test"))
        };

        apiClient.GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(
                gitlabEvents.Cast<GitlabEvent?>().ToAsyncEnumerable(),
                AsyncEnumerable.Empty<GitlabEvent?>());

        var request = new FindEventsRequest
        {
            UserId = 1,
            TaskId = "TEST-001",
            SearchAfter = Timestamp.FromDateTime(new System.DateTime(2024, 1, 1, 0, 0, 0, System.DateTimeKind.Utc))
        };
        var responseStream = new TestServerStreamWriter();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Find(request, responseStream, context);

        // Assert
        var responses = responseStream.GetResponses();
        responses.Should().HaveCount(1);
        responses[0].Event.Branch.Should().Be("TEST-001/dev");
    }

    [Fact]
    public async Task Find_FiltersByAction_ExcludesNonCreatedActions()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new FindEventsHandler(apiClient);

        var gitlabEvents = new[]
        {
            new GitlabEvent(
                ProjectId: 123,
                PushData: new PushData(Action: "created", Ref: "TEST-001/dev")),
            new GitlabEvent(
                ProjectId: 456,
                PushData: new PushData(Action: "deleted", Ref: "TEST-001/dev")),
            new GitlabEvent(
                ProjectId: 789,
                PushData: new PushData(Action: "pushed", Ref: "TEST-001/dev"))
        };

        apiClient.GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(
                gitlabEvents.Cast<GitlabEvent?>().ToAsyncEnumerable(),
                AsyncEnumerable.Empty<GitlabEvent?>());

        var request = new FindEventsRequest
        {
            UserId = 1,
            TaskId = "TEST-001",
            SearchAfter = Timestamp.FromDateTime(new System.DateTime(2024, 1, 1, 0, 0, 0, System.DateTimeKind.Utc))
        };
        var responseStream = new TestServerStreamWriter();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Find(request, responseStream, context);

        // Assert
        var responses = responseStream.GetResponses();
        responses.Should().HaveCount(1);
        responses[0].Event.ProjectId.Should().Be(123);
    }

    [Fact]
    public async Task Find_WithEmptyStream_ReturnsNoResponses()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new FindEventsHandler(apiClient);

        apiClient.GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable.Empty<GitlabEvent?>());

        var request = new FindEventsRequest
        {
            UserId = 1,
            TaskId = "TEST-001",
            SearchAfter = Timestamp.FromDateTime(new System.DateTime(2024, 1, 1, 0, 0, 0, System.DateTimeKind.Utc))
        };
        var responseStream = new TestServerStreamWriter();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Find(request, responseStream, context);

        // Assert
        var responses = responseStream.GetResponses();
        responses.Should().BeEmpty();
    }

    [Fact]
    public async Task Find_WithMultiplePages_StreamsAllMatchingEvents()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new FindEventsHandler(apiClient);

        var firstPageEvents = new[]
        {
            new GitlabEvent(
                ProjectId: 123,
                PushData: new PushData(Action: "created", Ref: "TEST-001/dev"))
        };

        var callCount = 0;
        apiClient.GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                callCount++;
                return callCount == 1
                    ? firstPageEvents.ToAsyncEnumerable().Cast<GitlabEvent?>()
                    : AsyncEnumerable.Empty<GitlabEvent?>();
            });

        var request = new FindEventsRequest
        {
            UserId = 1,
            TaskId = "TEST-001",
            SearchAfter = Timestamp.FromDateTime(new System.DateTime(2024, 1, 1, 0, 0, 0, System.DateTimeKind.Utc))
        };
        var responseStream = new TestServerStreamWriter();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Find(request, responseStream, context);

        // Assert
        var responses = responseStream.GetResponses();
        responses.Should().HaveCount(1);
        apiClient.Received(2).GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Find_PreservesEventData_BranchProjectIdAndTaskName()
    {
        // Arrange
        var apiClient = Substitute.For<IGitLabApiClient>();
        var handler = new FindEventsHandler(apiClient);

        var gitlabEvent = new GitlabEvent(
            ProjectId: 999,
            PushData: new PushData(Action: "created", Ref: "MY-TASK-123/dev"));

        apiClient.GetMany<GitlabEvent?>(Arg.Any<Uri>(), Arg.Any<CancellationToken>())
            .Returns(
                new[] { gitlabEvent }.ToAsyncEnumerable().Cast<GitlabEvent?>(),
                AsyncEnumerable.Empty<GitlabEvent?>());

        var request = new FindEventsRequest
        {
            UserId = 1,
            TaskId = "MY-TASK-123",
            SearchAfter = Timestamp.FromDateTime(new System.DateTime(2024, 1, 1, 0, 0, 0, System.DateTimeKind.Utc))
        };
        var responseStream = new TestServerStreamWriter();
        var context = Substitute.For<ServerCallContext>();
        context.CancellationToken.Returns(CancellationToken.None);

        // Act
        await handler.Find(request, responseStream, context);

        // Assert
        var responses = responseStream.GetResponses();
        responses.Should().HaveCount(1);
        responses[0].Event.Branch.Should().Be("MY-TASK-123/dev");
        responses[0].Event.ProjectId.Should().Be(999);
        responses[0].Event.TaskName.Should().Be("MY-TASK-123");
    }
}
