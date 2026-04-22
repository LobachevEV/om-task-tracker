using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using Xunit;
using CreateTaskDto = OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand.TaskDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class TasksControllerCreateTaskTests(TasksControllerWebApplicationFactory factory)
    : TasksControllerTestBase(factory)
{
    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    [Fact]
    public async Task CreateTask_WithoutAuthentication_Returns401()
    {
        var client = Factory.CreateClient();
        var response = await client.PostAsync("/api/tasks", JsonBody(new { jiraId = "JIRA-NEW", featureId = 1 }));
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateTask_WithValidPayload_Returns200()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        Factory.MockTaskCreator
            .Create(Arg.Any<CreateTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.StreamingCall(new CreateTaskResponse
            {
                Task = new CreateTaskDto { Id = 1, JiraTaskId = "JIRA-NEW", State = TaskState.NotStarted }
            }));

        var response = await client.PostAsync("/api/tasks", JsonBody(new { jiraId = "JIRA-NEW", featureId = 1 }));

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var respContent = await response.Content.ReadAsStringAsync();
        respContent.Should().Contain("JIRA-NEW");
        respContent.Should().Contain("NotStarted");
    }

    [Theory]
    [InlineData("")]
    [InlineData("AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")]
    public async Task CreateTask_WithInvalidJiraId_Returns400(string jiraId)
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        var response = await client.PostAsync("/api/tasks", JsonBody(new { jiraId, featureId = 1 }));

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateTask_WithNoResponses_Returns500()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        Factory.MockTaskCreator
            .Create(Arg.Any<CreateTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.EmptyStreamingCall<CreateTaskResponse>());

        var response = await client.PostAsync("/api/tasks", JsonBody(new { jiraId = "JIRA-FAIL", featureId = 1 }));

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.InternalServerError);
    }
}
