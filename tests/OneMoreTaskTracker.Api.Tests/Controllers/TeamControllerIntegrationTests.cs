using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class TeamControllerIntegrationTests(TasksControllerWebApplicationFactory factory)
    : IClassFixture<TasksControllerWebApplicationFactory>
{
    private static async Task<HttpResponseMessage> PostAsJsonAsync(HttpClient client, string uri, object payload)
    {
        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");
        return await client.PostAsync(uri, content);
    }

    private HttpClient ClientWithToken(int userId, string role, string email = "manager@example.com")
    {
        var token = factory.GenerateToken(userId, email, role);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task PostMember_WithoutAuthentication_Returns401()
    {
        var payload = new { email = "dev@example.com", role = "FrontendDeveloper" };
        var client = factory.CreateClient();
        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PostMember_WithDeveloperRole_Returns403()
    {
        var payload = new { email = "dev@example.com", role = "FrontendDeveloper" };
        var client = ClientWithToken(userId: 2, role: Roles.FrontendDeveloper, email: "dev@example.com");

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostMember_AsManagerWithValidPayload_Returns201WithResponse()
    {
        var payload = new { email = "newdev@example.com", role = "FrontendDeveloper" };
        var managerUserId = 7;
        var client = ClientWithToken(userId: managerUserId, role: Roles.Manager);

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
            {
                UserId = 42,
                Email = "newdev@example.com",
                Role = "FrontendDeveloper"
            }));

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("userId").GetInt32().Should().Be(42);
        root.GetProperty("email").GetString().Should().Be("newdev@example.com");
        root.GetProperty("role").GetString().Should().Be("FrontendDeveloper");
        root.GetProperty("managerId").GetInt32().Should().Be(managerUserId);
        root.GetProperty("temporaryPassword").GetString().Should().NotBeNullOrEmpty();
        root.GetProperty("temporaryPassword").GetString()!.Length.Should().Be(12);
    }

    [Fact]
    public async Task PostMember_WithManagerRole_Returns400()
    {
        var payload = new { email = "newmanager@example.com", role = "Manager" };
        var client = ClientWithToken(userId: 7, role: Roles.Manager);

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostMember_WithEmptyRole_Returns400()
    {
        var payload = new { email = "dev@example.com", role = "" };
        var client = ClientWithToken(userId: 7, role: Roles.Manager);

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostMember_WithInvalidRole_Returns400()
    {
        var payload = new { email = "dev@example.com", role = "Admin" };
        var client = ClientWithToken(userId: 7, role: Roles.Manager);

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostMember_WithDuplicateEmail_Returns409()
    {
        var payload = new { email = "existing@example.com", role = "FrontendDeveloper" };
        var client = ClientWithToken(userId: 7, role: Roles.Manager);

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(_ => throw new RpcException(new Status(StatusCode.AlreadyExists, "Email already registered")));

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        json.Should().Contain("email_already_registered");
    }

    [Fact]
    public async Task PostMember_ResponseShouldHaveCacheControlNoStore()
    {
        var payload = new { email = "dev@example.com", role = "BackendDeveloper" };
        var client = ClientWithToken(userId: 7, role: Roles.Manager);

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
            {
                UserId = 42,
                Email = "dev@example.com",
                Role = "BackendDeveloper"
            }));

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.Headers.CacheControl?.NoStore.Should().BeTrue();
    }

    [Fact]
    public async Task PostMember_CallsRegisterWithCorrectManagerId()
    {
        var payload = new { email = "dev@example.com", role = "Qa" };
        var managerUserId = 99;
        var client = ClientWithToken(userId: managerUserId, role: Roles.Manager);

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
            {
                UserId = 50,
                Email = "dev@example.com",
                Role = "Qa"
            }));

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("managerId").GetInt32().Should().Be(managerUserId);
    }

    [Fact]
    public async Task PostMember_IgnoresManagerIdInRequestBody()
    {
        var payload = new { email = "dev@example.com", role = "FrontendDeveloper", managerId = 999 };
        var actualManagerId = 7;
        var client = ClientWithToken(userId: actualManagerId, role: Roles.Manager);

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
            {
                UserId = 42,
                Email = "dev@example.com",
                Role = "FrontendDeveloper"
            }));

        var response = await PostAsJsonAsync(client, "/api/team/members", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("managerId").GetInt32().Should().Be(actualManagerId);
    }
}
