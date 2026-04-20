using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OneMoreTaskTracker.Api.Auth;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Auth;

public sealed class JwtTokenServiceTests
{
    private static JwtTokenService CreateService() =>
        new(Options.Create(new JwtOptions
        {
            Secret = "test-secret-key-that-is-at-least-32-chars-long!!",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpirationMinutes = 60
        }));

    private static JwtSecurityToken DecodeToken(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            "test-secret-key-that-is-at-least-32-chars-long!!"));

        var principal = handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = true,
            ValidIssuer = "TestIssuer",
            ValidateAudience = true,
            ValidAudience = "TestAudience",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        }, out var securityToken);

        return (JwtSecurityToken)securityToken;
    }

    [Fact]
    public void GenerateToken_ContainsCorrectClaims()
    {
        var service = CreateService();
        const int userId = 42;
        const string email = "test@example.com";
        const string role = "FrontendDeveloper";

        var token = service.GenerateToken(userId, email, role);

        token.Should().NotBeNullOrEmpty();

        var decodedToken = DecodeToken(token);
        decodedToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.NameIdentifier && c.Value == userId.ToString());
        decodedToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.Email && c.Value == email);
        decodedToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.Role && c.Value == role);
    }

    [Fact]
    public void GenerateToken_TokenIsValid()
    {
        var service = CreateService();

        var token = service.GenerateToken(1, "test@example.com", "FrontendDeveloper");

        var decodedToken = DecodeToken(token);
        decodedToken.Should().NotBeNull();
        decodedToken.Issuer.Should().Be("TestIssuer");
        decodedToken.Audiences.Should().Contain("TestAudience");
    }

    [Fact]
    public void GenerateToken_SetsExpiration()
    {
        var service = CreateService();
        var beforeGeneration = DateTime.UtcNow;

        var token = service.GenerateToken(1, "test@example.com", "FrontendDeveloper");

        var decodedToken = DecodeToken(token);
        var expiryTime = decodedToken.ValidTo;

        // Token should expire in approximately 60 minutes (±2 minutes for clock skew)
        var expectedExpiry = beforeGeneration.AddMinutes(60);
        var toleranceSeconds = 120;

        expiryTime.Should()
            .BeCloseTo(expectedExpiry, TimeSpan.FromSeconds(toleranceSeconds));
    }

    [Fact]
    public void GenerateToken_WithDifferentUsers_ProducesDifferentTokens()
    {
        var service = CreateService();

        var token1 = service.GenerateToken(1, "user1@example.com", "FrontendDeveloper");
        var token2 = service.GenerateToken(2, "user2@example.com", "Manager");

        token1.Should().NotBe(token2);
    }

    [Fact]
    public void GenerateToken_WithDifferentRoles_IncludesDifferentRoleClaims()
    {
        var service = CreateService();

        var developerToken = service.GenerateToken(1, "test@example.com", "FrontendDeveloper");
        var managerToken = service.GenerateToken(1, "test@example.com", "Manager");

        var decodedDeveloper = DecodeToken(developerToken);
        var decodedManager = DecodeToken(managerToken);

        decodedDeveloper.Claims.First(c => c.Type == ClaimTypes.Role).Value.Should().Be("FrontendDeveloper");
        decodedManager.Claims.First(c => c.Type == ClaimTypes.Role).Value.Should().Be("Manager");
    }

    [Fact]
    public void GenerateToken_WithIAuthUserContext_ContainsCorrectClaims()
    {
        var service = CreateService();
        var userContext = new MockAuthUserContext
        {
            UserId = 42,
            Email = "test@example.com",
            Role = "FrontendDeveloper",
            ManagerId = null
        };

        var token = service.GenerateToken(userContext);

        token.Should().NotBeNullOrEmpty();

        var decodedToken = DecodeToken(token);
        decodedToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.NameIdentifier && c.Value == "42");
        decodedToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.Email && c.Value == "test@example.com");
        decodedToken.Claims.Should().Contain(c =>
            c.Type == ClaimTypes.Role && c.Value == "FrontendDeveloper");
    }

    [Fact]
    public void GenerateToken_WithIAuthUserContext_IncludesManagerIdWhenPresent()
    {
        var service = CreateService();
        var userContext = new MockAuthUserContext
        {
            UserId = 42,
            Email = "test@example.com",
            Role = "FrontendDeveloper",
            ManagerId = 99
        };

        var token = service.GenerateToken(userContext);

        token.Should().NotBeNullOrEmpty();

        var decodedToken = DecodeToken(token);
        decodedToken.Claims.Should().Contain(c =>
            c.Type == "manager_id" && c.Value == "99");
    }

    [Fact]
    public void GenerateToken_WithIAuthUserContext_OmitsManagerIdWhenNull()
    {
        var service = CreateService();
        var userContext = new MockAuthUserContext
        {
            UserId = 42,
            Email = "test@example.com",
            Role = "FrontendDeveloper",
            ManagerId = null
        };

        var token = service.GenerateToken(userContext);

        var decodedToken = DecodeToken(token);
        decodedToken.Claims.Should().NotContain(c => c.Type == "manager_id");
    }

    private sealed class MockAuthUserContext : IAuthUserContext
    {
        public int UserId { get; init; }
        public string Email { get; init; } = string.Empty;
        public string Role { get; init; } = string.Empty;
        public int? ManagerId { get; init; }
    }
}
