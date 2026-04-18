using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Controllers;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;
using CreateTaskDto = OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand.TaskDto;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class TasksControllerIntegrationTests : IClassFixture<TasksControllerWebApplicationFactory>
{
    private readonly TasksControllerWebApplicationFactory _factory;

    public TasksControllerIntegrationTests(TasksControllerWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static AsyncUnaryCall<T> GrpcCall<T>(T response) =>
        new(Task.FromResult(response),
            Task.FromResult(new Metadata()),
            () => new Status(StatusCode.OK, string.Empty),
            () => new Metadata(),
            () => { });

    private static async Task<T?> ReadAsAsync<T>(HttpContent content)
    {
        var json = await content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    private string GetTokenForDeveloper(int userId = 1) =>
        _factory.GenerateToken(userId, "test@example.com", Roles.Developer);

    private string GetTokenForManager(int userId = 1) =>
        _factory.GenerateToken(userId, "manager@example.com", Roles.Manager);

    private HttpClient CreateClientWithToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    #region GetTasks Tests

    [Fact]
    public async Task GetTasks_WithoutAuthentication_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/tasks");
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTasks_WithDeveloperRole_Returns200()
    {
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        _factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new ListTasksResponse
            {
                Tasks = { new OneMoreTaskTracker.Proto.Tasks.ListTasksQuery.TaskDto { Id = 1, JiraTaskId = "JIRA-123", State = TaskState.InDev, UserId = 10 } }
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
        var token = GetTokenForManager(userId: 5);
        var client = CreateClientWithToken(token);

        _factory.MockUserService
            .GetTeamMemberIdsAsync(Arg.Any<GetTeamMemberIdsRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new GetTeamMemberIdsResponse { UserIds = { 11, 12 } }));

        _factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new ListTasksResponse
            {
                Tasks = { new OneMoreTaskTracker.Proto.Tasks.ListTasksQuery.TaskDto { Id = 1, JiraTaskId = "JIRA-100", State = TaskState.NotStarted, UserId = 5 } }
            }));

        var response = await client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        _factory.MockUserService.Received(1).GetTeamMemberIdsAsync(
            Arg.Any<GetTeamMemberIdsRequest>(),
            Arg.Any<Metadata>(),
            Arg.Any<DateTime?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetTasks_WithEmptyResult_ReturnsOkWithEmptyArray()
    {
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        _factory.MockTaskLister
            .ListTasksAsync(Arg.Any<ListTasksRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new ListTasksResponse()));

        var response = await client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("[]");
    }

    #endregion

    #region GetTask Tests

    [Fact]
    public async Task GetTask_WithoutAuthentication_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/tasks/JIRA-123");
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTask_WithValidId_Returns200()
    {
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        _factory.MockTaskGetter
            .GetAsync(Arg.Any<GetTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new GetTaskResponse
            {
                Id = "JIRA-123",
                State = TaskState.InDev,
                Projects = { new OneMoreTaskTracker.Proto.Tasks.GetTaskQuery.ProjectDto { Id = 1, Name = "ProjectA" } },
                MergeRequests = { new OneMoreTaskTracker.Proto.Tasks.GetTaskQuery.MergeRequestDto { Id = "mr-1", Title = "MR Title", SourceBranch = "feat/task", TargetBranch = "develop" } }
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
        var token = GetTokenForDeveloper(userId: 1);
        var client = CreateClientWithToken(token);

        _factory.MockTaskGetter
            .GetAsync(Arg.Any<GetTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new GetTaskResponse
            {
                Id = "JIRA-789",
                State = TaskState.MrToRelease,
                Projects =
                {
                    new OneMoreTaskTracker.Proto.Tasks.GetTaskQuery.ProjectDto { Id = 1, Name = "Project1" },
                    new OneMoreTaskTracker.Proto.Tasks.GetTaskQuery.ProjectDto { Id = 2, Name = "Project2" },
                    new OneMoreTaskTracker.Proto.Tasks.GetTaskQuery.ProjectDto { Id = 3, Name = "Project3" }
                },
                MergeRequests =
                {
                    new OneMoreTaskTracker.Proto.Tasks.GetTaskQuery.MergeRequestDto { Id = "mr-1", Title = "First MR", SourceBranch = "feat/1", TargetBranch = "develop" },
                    new OneMoreTaskTracker.Proto.Tasks.GetTaskQuery.MergeRequestDto { Id = "mr-2", Title = "Second MR", SourceBranch = "feat/2", TargetBranch = "develop" }
                }
            }));

        var response = await client.GetAsync("/api/tasks/JIRA-789");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Project1").And.Contain("Project2").And.Contain("Project3");
        content.Should().Contain("First MR").And.Contain("Second MR");
    }

    #endregion

    #region CreateTask Tests

    [Fact]
    public async Task CreateTask_WithoutAuthentication_Returns401()
    {
        var client = _factory.CreateClient();
        var payload = new { jiraId = "JIRA-NEW" };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/tasks", content);
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateTask_WithValidPayload_Returns200()
    {
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        _factory.MockTaskCreator
            .Create(Arg.Any<CreateTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(CreateStreamingCall(new CreateTaskResponse
            {
                Task = new CreateTaskDto { Id = 1, JiraTaskId = "JIRA-NEW", State = TaskState.NotStarted }
            }));

        var payload = new { jiraId = "JIRA-NEW" };
        var json = JsonSerializer.Serialize(payload);
        var body = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/tasks", body);

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
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        var payload = new { jiraId = jiraId };
        var json = JsonSerializer.Serialize(payload);
        var body = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/tasks", body);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateTask_WithNoResponses_Returns500()
    {
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        _factory.MockTaskCreator
            .Create(Arg.Any<CreateTaskRequest>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(CreateEmptyStreamingCall<CreateTaskResponse>());

        var payload = new { jiraId = "JIRA-FAIL" };
        var json = JsonSerializer.Serialize(payload);
        var body = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/tasks", body);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.InternalServerError);
    }

    #endregion

    #region MoveTask Tests

    [Fact]
    public async Task MoveTask_WithoutAuthentication_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsync("/api/tasks/JIRA-123/move", null);
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MoveTask_WithValidId_Returns200()
    {
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        _factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(CreateStreamingCall(new MoveTaskResponse
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
        var token = GetTokenForDeveloper(userId: 1);
        var client = CreateClientWithToken(token);

        _factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(CreateStreamingCall(new MoveTaskResponse
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
        var token = GetTokenForDeveloper(userId: 10);
        var client = CreateClientWithToken(token);

        _factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(CreateEmptyStreamingCall<MoveTaskResponse>());

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
        var token = GetTokenForDeveloper(userId: 1);
        var client = CreateClientWithToken(token);

        _factory.MockTaskMover
            .Handle(Arg.Any<MoveTaskCommand>(), Arg.Any<Metadata>(), Arg.Any<DateTime?>(), Arg.Any<CancellationToken>())
            .Returns(CreateStreamingCall(new MoveTaskResponse
            {
                State = state,
                Projects = { }
            }));

        var response = await client.PostAsync("/api/tasks/JIRA-STATE/move", null);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain($"\"{expectedStateString}\"");
    }

    #endregion

    #region Helper Methods

    private static AsyncServerStreamingCall<T> CreateStreamingCall<T>(T response)
    {
        var stream = ToAsyncEnumerable(response);
        return new AsyncServerStreamingCall<T>(
            new AsyncEnumerableAdapter<T>(stream),
            Task.FromResult(new Metadata()),
            () => new Status(StatusCode.OK, string.Empty),
            () => new Metadata(),
            () => { });
    }

    private static AsyncServerStreamingCall<T> CreateEmptyStreamingCall<T>()
    {
        return new AsyncServerStreamingCall<T>(
            new AsyncEnumerableAdapter<T>(EmptyAsyncEnumerable<T>()),
            Task.FromResult(new Metadata()),
            () => new Status(StatusCode.OK, string.Empty),
            () => new Metadata(),
            () => { });
    }

    private static async IAsyncEnumerable<T> ToAsyncEnumerable<T>(T item)
    {
        yield return item;
    }

    private static async IAsyncEnumerable<T> EmptyAsyncEnumerable<T>()
    {
        yield break;
    }

    #endregion
}

/// <summary>
/// Adapter to convert IAsyncEnumerable to IAsyncStreamReader for gRPC mocking.
/// </summary>
internal sealed class AsyncEnumerableAdapter<T> : IAsyncStreamReader<T>
{
    private readonly IAsyncEnumerator<T> _enumerator;

    public AsyncEnumerableAdapter(IAsyncEnumerable<T> enumerable)
    {
        _enumerator = enumerable.GetAsyncEnumerator();
    }

    public T Current => _enumerator.Current;

    public async Task<bool> MoveNext(CancellationToken cancellationToken)
    {
        return await _enumerator.MoveNextAsync();
    }

    public void Dispose()
    {
        _enumerator.DisposeAsync().AsTask().Wait();
    }
}

public sealed class TasksControllerWebApplicationFactory : WebApplicationFactory<Program>
{
    public TaskCreator.TaskCreatorClient MockTaskCreator { get; } =
        Substitute.For<TaskCreator.TaskCreatorClient>();

    public TaskLister.TaskListerClient MockTaskLister { get; } =
        Substitute.For<TaskLister.TaskListerClient>();

    public TaskGetter.TaskGetterClient MockTaskGetter { get; } =
        Substitute.For<TaskGetter.TaskGetterClient>();

    public TaskMover.TaskMoverClient MockTaskMover { get; } =
        Substitute.For<TaskMover.TaskMoverClient>();

    public UserService.UserServiceClient MockUserService { get; } =
        Substitute.For<UserService.UserServiceClient>();

    private const string JwtSecret = "test-secret-key-that-is-at-least-32-chars-long!!";
    private const string JwtIssuer = "TestIssuer";
    private const string JwtAudience = "TestAudience";

    public string GenerateToken(int userId, string email, string role)
    {
        using var scope = Services.CreateScope();
        var tokenService = scope.ServiceProvider.GetRequiredService<JwtTokenService>();
        return tokenService.GenerateToken(userId, email, role);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = JwtSecret,
                ["Jwt:Issuer"] = JwtIssuer,
                ["Jwt:Audience"] = JwtAudience,
                ["Jwt:ExpirationMinutes"] = "60",
                ["TasksService:Address"] = "http://localhost:5000",
                ["UsersService:Address"] = "http://localhost:5000",
                ["Cors:AllowedOrigins:0"] = "http://localhost:3000"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            var descriptors = services.Where(d =>
                d.ServiceType == typeof(UserService.UserServiceClient) ||
                d.ServiceType == typeof(TaskCreator.TaskCreatorClient) ||
                d.ServiceType == typeof(TaskLister.TaskListerClient) ||
                d.ServiceType == typeof(TaskGetter.TaskGetterClient) ||
                d.ServiceType == typeof(TaskMover.TaskMoverClient)
            ).ToList();

            foreach (var descriptor in descriptors)
                services.Remove(descriptor);

            services.AddSingleton(MockUserService);
            services.AddSingleton(MockTaskCreator);
            services.AddSingleton(MockTaskLister);
            services.AddSingleton(MockTaskGetter);
            services.AddSingleton(MockTaskMover);

            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters.IssuerSigningKey =
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret));
                options.TokenValidationParameters.ValidIssuer = JwtIssuer;
                options.TokenValidationParameters.ValidAudience = JwtAudience;
            });
        });
    }

}
