using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using CreateFeatureDto = OneMoreTaskTracker.Proto.Features.CreateFeatureCommand.FeatureDto;
using GetFeatureDto = OneMoreTaskTracker.Proto.Features.GetFeatureQuery.FeatureDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class PlanControllerTests(TasksControllerWebApplicationFactory factory)
    : IClassFixture<TasksControllerWebApplicationFactory>
{
    private readonly TasksControllerWebApplicationFactory _factory = factory;

    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    private HttpClient ClientWithToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private string ManagerToken(int userId = 1) =>
        _factory.GenerateToken(userId, "manager@example.com", Roles.Manager);

    private string QaToken(int userId = 1, int managerId = 99) =>
        _factory.GenerateToken(userId, "qa@example.com", Roles.Qa, managerId);

    private void StubEmptyTasks() =>
        _factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListTasksResponse()));

    [Fact]
    public async Task ListFeatures_WithoutAuthentication_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/plan/features");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateFeature_AsQa_Returns403()
    {
        var client = ClientWithToken(QaToken(userId: 42));
        var response = await client.PostAsync("/api/plan/features",
            JsonBody(new { title = "Foo", description = "bar" }));
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateFeature_AsManager_UsesCallerIdAsManagerUserId()
    {
        const int callerId = 77;
        var client = ClientWithToken(ManagerToken(userId: callerId));

        CreateFeatureRequest? capturedRequest = null;
        _factory.MockFeatureCreator
            .CreateAsync(Arg.Do<CreateFeatureRequest>(r => capturedRequest = r),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new CreateFeatureDto
            {
                Id = 321,
                Title = "Payments",
                Description = string.Empty,
                State = FeatureState.CsApproving,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = callerId,
                ManagerUserId = callerId
            }));

        var response = await client.PostAsync("/api/plan/features", JsonBody(new
        {
            title = "Payments",
            description = (string?)null,
            leadUserId = (int?)null,
            managerUserId = 9999
        }));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        capturedRequest.Should().NotBeNull();
        capturedRequest!.ManagerUserId.Should().Be(callerId);
        capturedRequest.LeadUserId.Should().Be(callerId);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"id\":321");
        body.Should().Contain("\"managerUserId\":77");
    }

    [Fact]
    public async Task AttachTask_WhenFeatureNotFound_Returns404()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));

        _factory.MockFeatureGetter
            .GetAsync(Arg.Is<GetFeatureRequest>(r => r.Id == 9999),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.NotFound, "feature not found")));

        var response = await client.PostAsync("/api/plan/features/9999/tasks/PROJ-1", new StringContent(""));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DetachTask_WithMissingBody_Returns422()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/plan/features/5/tasks/PROJ-1"));
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task DetachTask_WithZeroReassignId_Returns422()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/plan/features/5/tasks/PROJ-1")
        {
            Content = JsonBody(new { reassignToFeatureId = 0 })
        };
        var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task DetachTask_WithValidBody_Returns200()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));

        _factory.MockTaskFeatureLinker
            .DetachAsync(Arg.Any<DetachTaskFromFeatureRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new AttachTaskToFeatureResponse
            {
                TaskId = 1,
                JiraTaskId = "PROJ-1",
                FeatureId = 6,
                State = OneMoreTaskTracker.Proto.Tasks.TaskState.InDev
            }));

        _factory.MockFeatureGetter
            .GetAsync(Arg.Is<GetFeatureRequest>(r => r.Id == 5),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetFeatureDto
            {
                Id = 5,
                Title = "F5",
                Description = string.Empty,
                State = FeatureState.Development,
                PlannedStart = string.Empty,
                PlannedEnd = string.Empty,
                LeadUserId = 1,
                ManagerUserId = 1
            }));

        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/plan/features/5/tasks/PROJ-1")
        {
            Content = JsonBody(new { reassignToFeatureId = 6 })
        };
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"id\":5");
        body.Should().Contain("Development");
    }

    [Fact]
    public async Task ListFeatures_AsManager_ReturnsSummaries()
    {
        var client = ClientWithToken(ManagerToken(userId: 1));

        _factory.MockUserService
            .GetTeamMemberIdsAsync(Arg.Any<GetTeamMemberIdsRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new GetTeamMemberIdsResponse()));

        StubEmptyTasks();

        _factory.MockFeaturesLister
            .ListAsync(Arg.Any<ListFeaturesRequest>(),
                Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new ListFeaturesResponse
            {
                Features =
                {
                    new OneMoreTaskTracker.Proto.Features.ListFeaturesQuery.FeatureDto
                    {
                        Id = 1,
                        Title = "F1",
                        Description = "desc",
                        State = FeatureState.Development,
                        PlannedStart = "2026-01-01",
                        PlannedEnd = string.Empty,
                        LeadUserId = 1,
                        ManagerUserId = 1
                    }
                }
            }));

        var response = await client.GetAsync("/api/plan/features");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"id\":1");
        body.Should().Contain("Development");
        body.Should().Contain("\"plannedEnd\":null");
    }
}
