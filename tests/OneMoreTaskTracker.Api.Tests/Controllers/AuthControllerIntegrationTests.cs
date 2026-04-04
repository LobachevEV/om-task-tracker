using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class AuthControllerIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ApiWebApplicationFactory _factory;

    public AuthControllerIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static AsyncUnaryCall<T> GrpcCall<T>(T response) =>
        new(Task.FromResult(response),
            Task.FromResult(new Metadata()),
            () => new Status(StatusCode.OK, string.Empty),
            () => new Metadata(),
            () => { });

    private static async Task<HttpResponseMessage> PostAsJsonAsync(HttpClient client, string uri, object payload)
    {
        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");
        return await client.PostAsync(uri, content);
    }

    private static async Task<T?> ReadAsAsync<T>(HttpContent content)
    {
        var json = await content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    [Fact]
    public async Task Register_WithValidPayload_Returns200WithToken()
    {
        var payload = new { email = "test@example.com", password = "password123" };

        _factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new RegisterResponse
            {
                UserId = 1,
                Email = "test@example.com",
                Role = "Developer"
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("token").GetString().Should().NotBeNullOrEmpty();
        root.GetProperty("userId").GetInt32().Should().Be(1);
        root.GetProperty("email").GetString().Should().Be("test@example.com");
        root.GetProperty("role").GetString().Should().Be("Developer");
    }

    [Fact]
    public async Task Register_TokenCanBeDecoded()
    {
        var payload = new { email = "user@example.com", password = "password123" };

        _factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new RegisterResponse
            {
                UserId = 42,
                Email = "user@example.com",
                Role = "Manager"
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var token = doc.RootElement.GetProperty("token").GetString();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadToken(token) as JwtSecurityToken;
        jwtToken.Should().NotBeNull();
        jwtToken!.Claims.Should().Contain(c =>
            c.Type == System.Security.Claims.ClaimTypes.NameIdentifier && c.Value == "42");
        jwtToken.Claims.Should().Contain(c =>
            c.Type == System.Security.Claims.ClaimTypes.Email && c.Value == "user@example.com");
        jwtToken.Claims.Should().Contain(c =>
            c.Type == System.Security.Claims.ClaimTypes.Role && c.Value == "Manager");
    }

    public static TheoryData<string> InvalidRegisterBodies => new()
    {
        { """{"email":"notanemail","password":"password123"}""" },
        { """{"email":"test@example.com","password":"short12"}""" },
        { """{"password":"password123"}""" },
        { """{"email":"test@example.com"}""" },
    };

    [Theory]
    [MemberData(nameof(InvalidRegisterBodies))]
    public async Task Register_WithInvalidBody_Returns400(string json)
    {
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/auth/register", content);
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithManagerId_PassesItToGrpcService()
    {
        var payload = new { email = "dev@example.com", password = "password123", managerId = 5 };

        _factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                var req = (RegisterRequest)x[0];
                req.ManagerId.Should().Be(5);
                return GrpcCall(new RegisterResponse
                {
                    UserId = 2,
                    Email = "dev@example.com",
                    Role = "Developer"
                });
            });

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
    }

    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithToken()
    {
        var payload = new { email = "test@example.com", password = "password123" };

        _factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new AuthenticateResponse
            {
                Success = true,
                UserId = 1,
                Email = "test@example.com",
                Role = "Developer"
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/login", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("token").GetString().Should().NotBeNullOrEmpty();
        root.GetProperty("userId").GetInt32().Should().Be(1);
        root.GetProperty("email").GetString().Should().Be("test@example.com");
        root.GetProperty("role").GetString().Should().Be("Developer");
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_Returns401()
    {
        var payload = new { email = "test@example.com", password = "wrongpassword" };

        _factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new AuthenticateResponse { Success = false }));

        var response = await PostAsJsonAsync(_client, "/api/auth/login", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("error").GetString().Should().Be("Invalid email or password");
    }

    public static TheoryData<string> InvalidLoginBodies => new()
    {
        { """{"email":"notanemail","password":"password123"}""" },
        { """{"password":"password123"}""" },
        { """{"email":"test@example.com"}""" },
    };

    [Theory]
    [MemberData(nameof(InvalidLoginBodies))]
    public async Task Login_WithInvalidBody_Returns400(string json)
    {
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/auth/login", content);
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_TokenCanBeDecoded()
    {
        var payload = new { email = "manager@example.com", password = "password123" };

        _factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcCall(new AuthenticateResponse
            {
                Success = true,
                UserId = 99,
                Email = "manager@example.com",
                Role = "Manager"
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/login", payload);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var token = doc.RootElement.GetProperty("token").GetString();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadToken(token) as JwtSecurityToken;
        jwtToken.Should().NotBeNull();
        jwtToken!.Claims.Should().Contain(c =>
            c.Type == System.Security.Claims.ClaimTypes.NameIdentifier && c.Value == "99");
        jwtToken.Claims.Should().Contain(c =>
            c.Type == System.Security.Claims.ClaimTypes.Email && c.Value == "manager@example.com");
        jwtToken.Claims.Should().Contain(c =>
            c.Type == System.Security.Claims.ClaimTypes.Role && c.Value == "Manager");
    }

    [Fact]
    public async Task Login_PassesCorrectEmailAndPasswordToGrpcService()
    {
        var payload = new { email = "user@example.com", password = "mypassword" };

        _factory.MockUserService.ClearReceivedCalls();
        _factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                var req = (AuthenticateRequest)x[0];
                req.Email.Should().Be("user@example.com");
                req.Password.Should().Be("mypassword");
                return GrpcCall(new AuthenticateResponse { Success = true, UserId = 1, Email = "user@example.com", Role = "Developer" });
            });

        await PostAsJsonAsync(_client, "/api/auth/login", payload);

        _factory.MockUserService.Received(1).AuthenticateAsync(
            Arg.Any<AuthenticateRequest>(),
            Arg.Any<Metadata>(),
            Arg.Any<DateTime?>(),
            Arg.Any<CancellationToken>());
    }
}

public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    public UserService.UserServiceClient MockUserService { get; } =
        Substitute.For<UserService.UserServiceClient>();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-secret-key-that-is-at-least-32-chars-long!!",
                ["Jwt:Issuer"] = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience",
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
            services.AddSingleton(Substitute.For<TaskCreator.TaskCreatorClient>());
            services.AddSingleton(Substitute.For<TaskLister.TaskListerClient>());
            services.AddSingleton(Substitute.For<TaskGetter.TaskGetterClient>());
            services.AddSingleton(Substitute.For<TaskMover.TaskMoverClient>());
        });
    }
}
