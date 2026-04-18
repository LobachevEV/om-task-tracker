using FluentAssertions;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Proto.Clients.Events;
using OneMoreTaskTracker.Proto.Clients.Projects;
using OneMoreTaskTracker.Tasks.Projects;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.Projects;

public sealed class EventBasedProjectsProviderTests
{
    [Fact]
    public async System.Threading.Tasks.Task Get_ReturnsProjects_ForEachPushEvent()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var events = new[]
        {
            new FindEventsResponse { Event = new EventDto { ProjectId = 10, Branch = "feature/1", TaskName = "TASK-1" } },
            new FindEventsResponse { Event = new EventDto { ProjectId = 20, Branch = "feature/2", TaskName = "TASK-1" } }
        };
        var eventsCall = CreateMockAsyncStreamingCall(events);
        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 10), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 10, Name = "repo-1" } }));
        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 20), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 20, Name = "repo-2" } }));

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow.AddHours(-1));

        var result = await provider.Get(userId: 1, taskId: "TASK-1", firstPushDate: firstPush).ToListAsync();

        result.Should().HaveCount(2);
        result[0].Id.Should().Be(10);
        result[0].Name.Should().Be("repo-1");
        result[1].Id.Should().Be(20);
        result[1].Name.Should().Be("repo-2");
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_FiltersOutNullEvents()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var events = new[]
        {
            new FindEventsResponse { Event = new EventDto { ProjectId = 10, Branch = "feature/1", TaskName = "TASK-1" } },
            new FindEventsResponse { Event = null },
            new FindEventsResponse { Event = new EventDto { ProjectId = 20, Branch = "feature/2", TaskName = "TASK-1" } }
        };
        var eventsCall = CreateMockAsyncStreamingCall(events);
        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 10), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 10, Name = "repo-1" } }));
        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 20), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 20, Name = "repo-2" } }));

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow);

        var result = await provider.Get(userId: 1, taskId: "TASK-1", firstPushDate: firstPush).ToListAsync();

        result.Should().HaveCount(2);
        result.Select(p => p.Id).Should().ContainInOrder(10, 20);
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_ReturnsEmptySequence_WhenNoEventsFound()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var eventsCall = CreateMockAsyncStreamingCall(new List<FindEventsResponse>());
        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow);

        var result = await provider.Get(userId: 1, taskId: "TASK-999", firstPushDate: firstPush).ToListAsync();

        result.Should().BeEmpty();
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_PassesCorrectParameters_ToEventsFinder()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var eventsCall = CreateMockAsyncStreamingCall(new List<FindEventsResponse>());
        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow.AddHours(-2));

        await provider.Get(userId: 42, taskId: "TASK-123", firstPushDate: firstPush).ToListAsync();

        eventsFinder.Received(1).Find(Arg.Is<FindEventsRequest>(req =>
            req.UserId == 42 &&
            req.TaskId == "TASK-123" &&
            req.Action == "pushed" &&
            req.SearchAfter == firstPush));
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_FetchesProjectsForEachEvent_ByProjectId()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var events = new[]
        {
            new FindEventsResponse { Event = new EventDto { ProjectId = 100, Branch = "feature/1", TaskName = "TASK-1" } },
            new FindEventsResponse { Event = new EventDto { ProjectId = 200, Branch = "feature/2", TaskName = "TASK-1" } }
        };
        var eventsCall = CreateMockAsyncStreamingCall(events);
        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 100), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 100, Name = "repo-1" } }));
        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 200), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 200, Name = "repo-2" } }));

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow);

        _ = await provider.Get(userId: 1, taskId: "TASK-1", firstPushDate: firstPush).ToListAsync();

        _ = projectGetter.Received(1).GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 100), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>());
        _ = projectGetter.Received(1).GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 200), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>());
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_ReturnsProjectsInEventOrder()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var events = new[]
        {
            new FindEventsResponse { Event = new EventDto { ProjectId = 5, Branch = "feature/a", TaskName = "TASK-1" } },
            new FindEventsResponse { Event = new EventDto { ProjectId = 15, Branch = "feature/b", TaskName = "TASK-1" } },
            new FindEventsResponse { Event = new EventDto { ProjectId = 25, Branch = "feature/c", TaskName = "TASK-1" } }
        };
        var eventsCall = CreateMockAsyncStreamingCall(events);
        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 5), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 5, Name = "repo-5" } }));
        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 15), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 15, Name = "repo-15" } }));
        projectGetter.GetAsync(Arg.Is<GetProjectQuery>(q => q.Id == 25), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(CreateMockAsyncUnaryCall(new GetProjectResponse { Project = new ProjectDto { Id = 25, Name = "repo-25" } }));

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow);

        var result = await provider.Get(userId: 1, taskId: "TASK-1", firstPushDate: firstPush).ToListAsync();

        result.Should().HaveCount(3);
        result.Select(p => p.Id).Should().ContainInOrder(5, 15, 25);
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_ThrowsRpcException_OnEventStreamError()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var rpcException = new RpcException(new Status(StatusCode.Unavailable, "Service unavailable"));

        var enumerable = ThrowingAsyncEnumerable<FindEventsResponse>(rpcException);
        var mockStream = new MockAsyncStreamReader(enumerable);

        var eventsCall = new AsyncServerStreamingCall<FindEventsResponse>(
            mockStream,
            Task.FromResult(new Metadata()),
            () => Status.DefaultSuccess,
            () => new Metadata(),
            () => { });

        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow);

        var act = async () => await provider.Get(userId: 1, taskId: "TASK-1", firstPushDate: firstPush).ToListAsync();

        await act.Should().ThrowAsync<RpcException>();
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_ThrowsRpcException_OnProjectGetterError()
    {
        var eventsFinder = Substitute.For<EventsFinder.EventsFinderClient>();
        var projectGetter = Substitute.For<ProjectGetter.ProjectGetterClient>();

        var events = new[]
        {
            new FindEventsResponse { Event = new EventDto { ProjectId = 10, Branch = "feature/1", TaskName = "TASK-1" } }
        };
        var eventsCall = CreateMockAsyncStreamingCall(events);
        eventsFinder.Find(Arg.Any<FindEventsRequest>())
            .Returns(eventsCall);

        var projectException = new RpcException(new Status(StatusCode.NotFound, "Project not found"));
        var mockCall = new AsyncUnaryCall<GetProjectResponse>(
            Task.FromException<GetProjectResponse>(projectException),
            Task.FromResult(new Metadata()),
            () => Status.DefaultSuccess,
            () => new Metadata(),
            () => { });
        projectGetter.GetAsync(Arg.Any<GetProjectQuery>(), headers: null, deadline: null, cancellationToken: Arg.Any<CancellationToken>())
            .Returns(mockCall);

        var provider = new EventBasedProjectsProvider(eventsFinder, projectGetter);
        var firstPush = Timestamp.FromDateTime(DateTime.UtcNow);

        var act = async () => await provider.Get(userId: 1, taskId: "TASK-1", firstPushDate: firstPush).ToListAsync();

        await act.Should().ThrowAsync<RpcException>();
    }

    private class MockAsyncStreamReader(IAsyncEnumerable<FindEventsResponse> enumerable) : IAsyncStreamReader<FindEventsResponse>
    {
        private readonly IAsyncEnumerator<FindEventsResponse> _enumerator = enumerable.GetAsyncEnumerator();

        public FindEventsResponse Current => _enumerator.Current;

        public async Task<bool> MoveNext(CancellationToken cancellationToken)
        {
            return await _enumerator.MoveNextAsync();
        }

        public void Dispose()
        {
            _enumerator.DisposeAsync().AsTask().GetAwaiter().GetResult();
        }
    }

    private static AsyncServerStreamingCall<FindEventsResponse> CreateMockAsyncStreamingCall(
        IEnumerable<FindEventsResponse> responses)
    {
        var enumerable = ToAsyncEnumerable(responses);
        var mockStream = new MockAsyncStreamReader(enumerable);

        return new AsyncServerStreamingCall<FindEventsResponse>(
            mockStream,
            Task.FromResult(new Metadata()),
            () => Status.DefaultSuccess,
            () => new Metadata(),
            () => { });
    }

    private static AsyncUnaryCall<GetProjectResponse> CreateMockAsyncUnaryCall(GetProjectResponse response)
    {
        return new AsyncUnaryCall<GetProjectResponse>(
            Task.FromResult(response),
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
