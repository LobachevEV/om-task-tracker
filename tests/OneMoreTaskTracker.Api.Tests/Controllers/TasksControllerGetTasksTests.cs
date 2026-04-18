using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class TasksControllerGetTasksTests(TasksControllerWebApplicationFactory factory) : TasksControllerTestBase(factory)
{
    [Fact]
    public async Task GetTasks_WithoutAuthentication_Returns401()
    {
        var client = Factory.CreateClient();
        var response = await client.GetAsync("/api/tasks");
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTasks_WithDeveloperRole_Returns200()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        Factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListTasksResponse
            {
                Tasks = { new TaskDto { Id = 1, JiraTaskId = "JIRA-123", State = TaskState.InDev, UserId = 10 } }
            }));

        var response = await client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("JIRA-123");
        content.Should().Contain("InDev");
    }

    [Fact]
    public async Task GetTasks_WithManagerRole_CallsGetTeamMemberIds()
    {
        var client = ClientWithToken(TokenForManager(userId: 5));

        Factory.MockUserService
            .GetTeamMemberIdsAsync(Arg.Any<GetTeamMemberIdsRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamMemberIdsResponse { UserIds = { 11, 12 } }));

        Factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListTasksResponse
            {
                Tasks = { new TaskDto { Id = 1, JiraTaskId = "JIRA-100", State = TaskState.NotStarted, UserId = 5 } }
            }));

        var response = await client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        _ = Factory.MockUserService.Received(1).GetTeamMemberIdsAsync(
            Arg.Any<GetTeamMemberIdsRequest>(),
            Arg.Any<Metadata>(),
            Arg.Any<DateTime?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetTasks_WithEmptyResult_ReturnsOkWithEmptyArray()
    {
        var client = ClientWithToken(TokenForDeveloper(userId: 10));

        Factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListTasksResponse()));

        var response = await client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("[]");
    }
}
