using FluentAssertions;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Tasks.MergeRequests;
using OneMoreTaskTracker.Tasks.Projects;
using OneMoreTaskTracker.Tasks.Tasks.Get;
using OneMoreTaskTracker.Tasks.Tests.TestHelpers;
using ProjectDto = OneMoreTaskTracker.Proto.Clients.Projects.ProjectDto;
using Xunit;

namespace OneMoreTaskTracker.Tasks.Tests.Tasks.Get;

public sealed class GetTaskHandlerTests
{
    [Fact]
    public async System.Threading.Tasks.Task Get_WhenMergedMrsFound_ReturnsInTestStateWithMrsAndProjects()
    {
        // Arrange
        var mrsProvider = Substitute.For<IMrsProvider>();
        var mrs = new[]
        {
            new FakeMrInfo(Iid: 1, ProjectId: 10, ProjectName: "repo-1", Title: "Feature 1", SourceBranch: "feature/1", TargetBranch: "master"),
            new FakeMrInfo(Iid: 2, ProjectId: 20, ProjectName: "repo-2", Title: "Feature 2", SourceBranch: "feature/2", TargetBranch: "release")
        };
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(mrs));

        var projectsProvider = Substitute.For<IProjectsProvider>();

        var handler = new GetTaskHandler(projectsProvider, mrsProvider);
        var request = new GetTaskRequest
        {
            TaskId = "TASK-123",
            UserId = 1
        };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        // Act
        var response = await handler.Get(request, ctx);

        // Assert
        response.State.Should().Be(TaskState.InTest);
        response.MergeRequests.Should().HaveCount(2);
        response.Projects.Should().HaveCount(2);
        response.Id.Should().Be("TASK-123");
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_WhenNoMergedMrs_AndProjectsFound_ReturnsInDevState()
    {
        // Arrange
        var mrsProvider = Substitute.For<IMrsProvider>();
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(Array.Empty<FakeMrInfo>()));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        var projects = new[]
        {
            new ProjectDto { Id = 100, Name = "project-1" },
            new ProjectDto { Id = 101, Name = "project-2" }
        };
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Timestamp>())
            .Returns(ToAsyncEnumerable(projects));

        var handler = new GetTaskHandler(projectsProvider, mrsProvider);
        var request = new GetTaskRequest
        {
            TaskId = "TASK-456",
            UserId = 1
        };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        // Act
        var response = await handler.Get(request, ctx);

        // Assert
        response.State.Should().Be(TaskState.InDev);
        response.Projects.Should().HaveCount(2);
        response.MergeRequests.Should().HaveCount(0);
    }

    [Fact]
    public async System.Threading.Tasks.Task Get_WhenNoMergedMrsAndNoProjects_ReturnsNotStarted()
    {
        // Arrange
        var mrsProvider = Substitute.For<IMrsProvider>();
        mrsProvider.Find(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ToAsyncEnumerable(Array.Empty<FakeMrInfo>()));

        var projectsProvider = Substitute.For<IProjectsProvider>();
        projectsProvider.Get(Arg.Any<int>(), Arg.Any<string>(), Arg.Any<Google.Protobuf.WellKnownTypes.Timestamp>())
            .Returns(ToAsyncEnumerable(Array.Empty<ProjectDto>()));

        var handler = new GetTaskHandler(projectsProvider, mrsProvider);
        var request = new GetTaskRequest
        {
            TaskId = "TASK-789",
            UserId = 1
        };
        var ctx = Substitute.For<ServerCallContext>();
        ctx.CancellationToken.Returns(CancellationToken.None);

        // Act
        var response = await handler.Get(request, ctx);

        // Assert
        response.State.Should().Be(TaskState.NotStarted);
        response.Projects.Should().HaveCount(0);
        response.MergeRequests.Should().HaveCount(0);
    }

    private static async IAsyncEnumerable<T> ToAsyncEnumerable<T>(IEnumerable<T> items)
    {
        foreach (var item in items)
            yield return item;
        await System.Threading.Tasks.Task.CompletedTask;
    }
}
