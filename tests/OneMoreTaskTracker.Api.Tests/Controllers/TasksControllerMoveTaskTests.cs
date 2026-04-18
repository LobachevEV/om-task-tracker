using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Tasks;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class TasksControllerMoveTaskTests(TasksControllerWebApplicationFactory factory) : TasksControllerTestBase(factory)
{
    [Fact]
    public async Task MoveTask_WithoutAuthentication_Returns401()
    {
        var client = Factory.CreateClient();
        var response = await client.PostAsync("/api/tasks/JIRA-123/move", null);
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MoveTask_WithValidId_Returns200()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        Factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.StreamingCall(new MoveTaskResponse
            {
                State = TaskState.InDev,
                Projects = { new TaskProjectDto { Id = "1", Name = "ProjectA" } }
            }));

        var response = await client.PostAsync("/api/tasks/JIRA-MOVE/move", null);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("InDev");
        content.Should().Contain("ProjectA");
    }

    [Fact]
    public async Task MoveTask_WithMultipleProjects_ReturnsAll()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 1));

        Factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.StreamingCall(new MoveTaskResponse
            {
                State = TaskState.InTest,
                Projects =
                {
                    new TaskProjectDto { Id = "100", Name = "FrontEnd" },
                    new TaskProjectDto { Id = "200", Name = "BackEnd" },
                    new TaskProjectDto { Id = "300", Name = "DevOps" }
                }
            }));

        var response = await client.PostAsync("/api/tasks/JIRA-MULTI/move", null);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("FrontEnd").And.Contain("BackEnd").And.Contain("DevOps");
    }

    [Fact]
    public async Task MoveTask_WithNoResponses_Returns500()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        Factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.EmptyStreamingCall<MoveTaskResponse>());

        var response = await client.PostAsync("/api/tasks/JIRA-FAIL/move", null);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.InternalServerError);
    }

    [Theory]
    [InlineData(TaskState.NotStarted, "NotStarted")]
    [InlineData(TaskState.InDev, "InDev")]
    [InlineData(TaskState.MrToRelease, "MrToRelease")]
    [InlineData(TaskState.InTest, "InTest")]
    [InlineData(TaskState.MrToMaster, "MrToMaster")]
    [InlineData(TaskState.Completed, "Completed")]
    public async Task MoveTask_MapsTaskStatesCorrectly(TaskState state, string expectedStateString)
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 1));

        Factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.StreamingCall(new MoveTaskResponse { State = state }));

        var response = await client.PostAsync("/api/tasks/JIRA-STATE/move", null);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain($"\"{expectedStateString}\"");
    }
}
