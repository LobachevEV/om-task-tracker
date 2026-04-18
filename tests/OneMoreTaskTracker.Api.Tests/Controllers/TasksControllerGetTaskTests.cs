using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class TasksControllerGetTaskTests(TasksControllerWebApplicationFactory factory) : TasksControllerTestBase(factory)
{
    [Fact]
    public async Task GetTask_WithoutAuthentication_Returns401()
    {
        var client = Factory.CreateClient();
        var response = await client.GetAsync("/api/tasks/JIRA-123");
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTask_WithValidId_Returns200()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        Factory.MockTaskGetter
            .GetAsync(Arg.Any<GetTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTaskResponse
            {
                Id = "JIRA-123",
                State = TaskState.InDev,
                Projects = { new ProjectDto { Id = 1, Name = "ProjectA" } },
                MergeRequests = { new MergeRequestDto { Id = "mr-1", Title = "MR Title", SourceBranch = "feat/task", TargetBranch = "develop" } }
            }));

        var response = await client.GetAsync("/api/tasks/JIRA-123");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("JIRA-123");
        content.Should().Contain("InDev");
        content.Should().Contain("ProjectA");
    }

    [Fact]
    public async Task GetTask_WithMultipleProjects_ReturnsAll()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 1));

        Factory.MockTaskGetter
            .GetAsync(Arg.Any<GetTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTaskResponse
            {
                Id = "JIRA-789",
                State = TaskState.MrToRelease,
                Projects =
                {
                    new ProjectDto { Id = 1, Name = "Project1" },
                    new ProjectDto { Id = 2, Name = "Project2" },
                    new ProjectDto { Id = 3, Name = "Project3" }
                },
                MergeRequests =
                {
                    new MergeRequestDto { Id = "mr-1", Title = "First MR", SourceBranch = "feat/1", TargetBranch = "develop" },
                    new MergeRequestDto { Id = "mr-2", Title = "Second MR", SourceBranch = "feat/2", TargetBranch = "develop" }
                }
            }));

        var response = await client.GetAsync("/api/tasks/JIRA-789");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Project1").And.Contain("Project2").And.Contain("Project3");
        content.Should().Contain("First MR").And.Contain("Second MR");
    }
}
