using FluentAssertions;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Tasks.MergeRequests;
using OneMoreTaskTracker.Tasks.Projects;
using OneMoreTaskTracker.Tasks.Tasks.Create;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using OneMoreTaskTracker.Tasks.Tests.TestHelpers;
using ProjectDto = OneMoreTaskTracker.Proto.Clients.Projects.ProjectDto;
using Xunit;
using Task = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tests.Tasks.Create;

public sealed class CreateTaskHandlerTests
{
    [Fact]
    public async System.Threading.Tasks.Task Create_SavesTaskToDatabase()
    {
        var db = CreateDb();
        var mrsProvider = Substitute.For<IMrsProvider>();
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(Array.Empty<FakeMrInfo>()));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Timestamp>())
            .Returns(ToAsyncEnumerable(Array.Empty<ProjectDto>()));

        var handler = new CreateTaskHandler(db, projectsProvider, mrsProvider);
        var request = new CreateTaskRequest { JiraTaskId = "TASK-123", UserId = 42, FeatureId = 1 };
        var writer = new FakeServerStreamWriter<CreateTaskResponse>();
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        await handler.Create(request, writer, ctx);

        var savedTask = await db.Tasks.FirstOrDefaultAsync();
        savedTask.Should().NotBeNull();
        savedTask!.JiraId.Should().Be("TASK-123");
        savedTask.UserId.Should().Be(42);
        savedTask.FeatureId.Should().Be(1);
    }

    [Fact]
    public async System.Threading.Tasks.Task Create_StreamsInitialTaskResponse()
    {
        var db = CreateDb();
        var mrsProvider = Substitute.For<IMrsProvider>();
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(Array.Empty<FakeMrInfo>()));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Timestamp>())
            .Returns(ToAsyncEnumerable(Array.Empty<ProjectDto>()));

        var handler = new CreateTaskHandler(db, projectsProvider, mrsProvider);
        var request = new CreateTaskRequest { JiraTaskId = "TASK-456", UserId = 1, FeatureId = 1 };
        var writer = new FakeServerStreamWriter<CreateTaskResponse>();
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        await handler.Create(request, writer, ctx);

        writer.Written.Should().HaveCount(1);
        writer.Written[0].Task.Should().NotBeNull();
    }

    [Fact]
    public async System.Threading.Tasks.Task Create_WhenMrsFound_StreamsSecondResponseWithMrsAndProjects()
    {
        var db = CreateDb();
        var mrsProvider = Substitute.For<IMrsProvider>();
        var mrs = new[]
        {
            new FakeMrInfo(Iid: 1, ProjectId: 10, ProjectName: "repo-1"),
            new FakeMrInfo(Iid: 2, ProjectId: 20, ProjectName: "repo-2")
        };
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(mrs));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Timestamp>())
            .Returns(ToAsyncEnumerable(Array.Empty<ProjectDto>()));

        var handler = new CreateTaskHandler(db, projectsProvider, mrsProvider);
        var request = new CreateTaskRequest { JiraTaskId = "TASK-789", UserId = 1, FeatureId = 1 };
        var writer = new FakeServerStreamWriter<CreateTaskResponse>();
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        await handler.Create(request, writer, ctx);

        writer.Written.Should().HaveCount(2);
        writer.Written[0].Task.Should().NotBeNull();
        writer.Written[1].MergeRequests.Should().HaveCount(2);
        writer.Written[1].Projects.Should().HaveCount(2);
    }

    [Fact]
    public async System.Threading.Tasks.Task Create_WhenMrsFound_DoesNotQueryProjects()
    {
        var db = CreateDb();
        var mrsProvider = Substitute.For<IMrsProvider>();
        var mrs = new[] { new FakeMrInfo(Iid: 1) };
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(mrs));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Timestamp>())
            .Returns(ToAsyncEnumerable(Array.Empty<ProjectDto>()));

        var handler = new CreateTaskHandler(db, projectsProvider, mrsProvider);
        var request = new CreateTaskRequest { JiraTaskId = "TASK-999", UserId = 1, FeatureId = 1 };
        var writer = new FakeServerStreamWriter<CreateTaskResponse>();
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        await handler.Create(request, writer, ctx);

        projectsProvider.Received(0).Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Google.Protobuf.WellKnownTypes.Timestamp>());
    }

    [Fact]
    public async System.Threading.Tasks.Task Create_WhenNoMrsButProjectsFound_StreamsProjectsResponse()
    {
        var db = CreateDb();
        var mrsProvider = Substitute.For<IMrsProvider>();
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(Array.Empty<FakeMrInfo>()));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        var projects = new[]
        {
            new ProjectDto { Id = 100, Name = "project-1" },
            new ProjectDto { Id = 101, Name = "project-2" }
        };
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Google.Protobuf.WellKnownTypes.Timestamp>())
            .Returns(ToAsyncEnumerable(projects));

        var handler = new CreateTaskHandler(db, projectsProvider, mrsProvider);
        var request = new CreateTaskRequest { JiraTaskId = "TASK-111", UserId = 1, FeatureId = 1 };
        var writer = new FakeServerStreamWriter<CreateTaskResponse>();
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        await handler.Create(request, writer, ctx);

        writer.Written.Should().HaveCount(2);
        writer.Written[1].Projects.Should().HaveCount(2);
    }

    [Fact]
    public async System.Threading.Tasks.Task Create_WhenNoMrsAndNoProjects_StreamsOnlyInitialResponse()
    {
        var db = CreateDb();
        var mrsProvider = Substitute.For<IMrsProvider>();
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(Array.Empty<FakeMrInfo>()));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Timestamp>())
            .Returns(ToAsyncEnumerable(Array.Empty<ProjectDto>()));

        var handler = new CreateTaskHandler(db, projectsProvider, mrsProvider);
        var request = new CreateTaskRequest { JiraTaskId = "TASK-222", UserId = 1, FeatureId = 1 };
        var writer = new FakeServerStreamWriter<CreateTaskResponse>();
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        await handler.Create(request, writer, ctx);

        writer.Written.Should().HaveCount(1);
        writer.Written[0].Task.Should().NotBeNull();
    }

    [Fact]
    public async System.Threading.Tasks.Task Create_WhenFeatureIdIsZero_ThrowsInvalidArgument()
    {
        var validator = new CreateTaskRequestValidator();
        var request = new CreateTaskRequest { JiraTaskId = "TASK-000", UserId = 1, FeatureId = 0 };

        var ex = await Assert.ThrowsAsync<RpcException>(() =>
            ValidationPipeline.ValidateAsync(validator, request));

        ex.StatusCode.Should().Be(StatusCode.InvalidArgument);
        ex.Status.Detail.Should().Contain("feature_id");
    }

    private static TasksDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<TasksDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private sealed class FakeServerStreamWriter<T> : IServerStreamWriter<T>
    {
        public List<T> Written { get; } = [];
        public WriteOptions? WriteOptions { get; set; }

        public System.Threading.Tasks.Task WriteAsync(T message)
        {
            Written.Add(message);
            return System.Threading.Tasks.Task.CompletedTask;
        }
    }

    private static async IAsyncEnumerable<T> ToAsyncEnumerable<T>(IEnumerable<T> items)
    {
        foreach (var item in items)
            yield return item;
        await System.Threading.Tasks.Task.CompletedTask;
    }
}
