using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Grpc.Core;
using NSubstitute;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class AuthControllerIntegrationTests(ApiWebApplicationFactory factory) : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private static async Task<HttpResponseMessage> PostAsJsonAsync(HttpClient client, string uri, object payload)
    {
        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");
        return await client.PostAsync(uri, content);
    }

    [Fact]
    public async Task Register_WithValidPayload_Returns200WithToken()
    {
        var payload = new { email = "test@example.com", password = "password123" };

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
            {
                UserId = 1,
                Email = "test@example.com",
                Role = "Manager"
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("token").GetString().Should().NotBeNullOrEmpty();
        root.GetProperty("userId").GetInt32().Should().Be(1);
        root.GetProperty("email").GetString().Should().Be("test@example.com");
        root.GetProperty("role").GetString().Should().Be("Manager");
    }

    [Fact]
    public async Task Register_TokenCanBeDecoded()
    {
        var payload = new { email = "user@example.com", password = "password123" };

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
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
    public async Task Register_WithValidPayload_PassesManagerId0ToGrpcService()
    {
        var payload = new { email = "user@example.com", password = "password123" };

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                var req = (RegisterRequest)x[0];
                req.ManagerId.Should().Be(0);
                return GrpcTestHelpers.UnaryCall(new RegisterResponse
                {
                    UserId = 1,
                    Email = "user@example.com",
                    Role = "Manager"
                });
            });

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
    }

    [Fact]
    public async Task Register_WithExtraManagerIdField_IsIgnoredAndRoleIsManager()
    {
        var payload = new { email = "user@example.com", password = "password123", managerId = 5 };

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(x =>
            {
                var req = (RegisterRequest)x[0];
                // Extra field should be ignored, so ManagerId should still be 0
                req.ManagerId.Should().Be(0);
                return GrpcTestHelpers.UnaryCall(new RegisterResponse
                {
                    UserId = 1,
                    Email = "user@example.com",
                    Role = "Manager"
                });
            });

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("role").GetString().Should().Be("Manager");
    }

    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithToken()
    {
        var payload = new { email = "test@example.com", password = "password123" };

        factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new AuthenticateResponse
            {
                Success = true,
                UserId = 1,
                Email = "test@example.com",
                Role = "FrontendDeveloper"
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/login", payload);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("token").GetString().Should().NotBeNullOrEmpty();
        root.GetProperty("userId").GetInt32().Should().Be(1);
        root.GetProperty("email").GetString().Should().Be("test@example.com");
        root.GetProperty("role").GetString().Should().Be("FrontendDeveloper");
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_Returns401()
    {
        var payload = new { email = "test@example.com", password = "wrongpassword" };

        factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new AuthenticateResponse { Success = false }));

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

        factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new AuthenticateResponse
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

        factory.MockUserService.ClearReceivedCalls();
        factory.MockUserService
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
                return GrpcTestHelpers.UnaryCall(new AuthenticateResponse { Success = true, UserId = 1, Email = "user@example.com", Role = "Developer" });
            });

        await PostAsJsonAsync(_client, "/api/auth/login", payload);

        factory.MockUserService.Received(1).AuthenticateAsync(
            Arg.Any<AuthenticateRequest>(),
            Arg.Any<Metadata>(),
            Arg.Any<DateTime?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Register_WithManagerUser_IncludesManagerIdClaimInToken()
    {
        var payload = new { email = "developer@example.com", password = "password123" };

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
            {
                UserId = 2,
                Email = "developer@example.com",
                Role = "FrontendDeveloper",
                ManagerUserId = 1  // Developer is managed by user 1
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var token = doc.RootElement.GetProperty("token").GetString();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadToken(token) as JwtSecurityToken;
        jwtToken.Should().NotBeNull();
        jwtToken!.Claims.Should().Contain(c =>
            c.Type == "manager_id" && c.Value == "1");
    }

    [Fact]
    public async Task Register_WithoutManager_DoesNotIncludeManagerIdClaimInToken()
    {
        var payload = new { email = "manager@example.com", password = "password123" };

        factory.MockUserService
            .RegisterAsync(
                Arg.Any<RegisterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new RegisterResponse
            {
                UserId = 1,
                Email = "manager@example.com",
                Role = "Manager",
                ManagerUserId = 0  // No manager
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/register", payload);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var token = doc.RootElement.GetProperty("token").GetString();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadToken(token) as JwtSecurityToken;
        jwtToken.Should().NotBeNull();
        jwtToken!.Claims.Should().NotContain(c => c.Type == "manager_id");
    }

    [Fact]
    public async Task Login_WithManagerUser_IncludesManagerIdClaimInToken()
    {
        var payload = new { email = "developer@example.com", password = "password123" };

        factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new AuthenticateResponse
            {
                Success = true,
                UserId = 2,
                Email = "developer@example.com",
                Role = "FrontendDeveloper",
                ManagerUserId = 1  // Developer is managed by user 1
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/login", payload);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var token = doc.RootElement.GetProperty("token").GetString();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadToken(token) as JwtSecurityToken;
        jwtToken.Should().NotBeNull();
        jwtToken!.Claims.Should().Contain(c =>
            c.Type == "manager_id" && c.Value == "1");
    }

    [Fact]
    public async Task Login_WithoutManager_DoesNotIncludeManagerIdClaimInToken()
    {
        var payload = new { email = "manager@example.com", password = "password123" };

        factory.MockUserService
            .AuthenticateAsync(
                Arg.Any<AuthenticateRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new AuthenticateResponse
            {
                Success = true,
                UserId = 1,
                Email = "manager@example.com",
                Role = "Manager",
                ManagerUserId = 0  // No manager
            }));

        var response = await PostAsJsonAsync(_client, "/api/auth/login", payload);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var token = doc.RootElement.GetProperty("token").GetString();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadToken(token) as JwtSecurityToken;
        jwtToken.Should().NotBeNull();
        jwtToken!.Claims.Should().NotContain(c => c.Type == "manager_id");
    }
}
