using System.Security.Claims;
using FluentAssertions;
using OneMoreTaskTracker.Api.Auth;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Auth;

public sealed class ClaimsPrincipalExtensionsTests
{
    private static ClaimsPrincipal CreatePrincipal(int? userId = 42, string? role = "Developer")
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.ToString()!));
        if (role != null)
            claims.Add(new Claim(ClaimTypes.Role, role));

        return new ClaimsPrincipal(new ClaimsIdentity(claims));
    }

    [Fact]
    public void GetUserId_ReturnsIntFromNameIdentifierClaim()
    {
        // Arrange
        var principal = CreatePrincipal(userId: 42);

        // Act
        var userId = principal.GetUserId();

        // Assert
        userId.Should().Be(42);
    }

    [Fact]
    public void GetUserId_WithDifferentUserIds_ReturnsCorrectValue()
    {
        // Arrange
        var principal1 = CreatePrincipal(userId: 1);
        var principal2 = CreatePrincipal(userId: 9999);

        // Act
        var userId1 = principal1.GetUserId();
        var userId2 = principal2.GetUserId();

        // Assert
        userId1.Should().Be(1);
        userId2.Should().Be(9999);
    }

    [Fact]
    public void GetUserId_WhenClaimMissing_ThrowsInvalidOperationException()
    {
        // Arrange
        var principal = CreatePrincipal(userId: null);

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*NameIdentifier claim is missing from token*");
    }

    [Fact]
    public void GetUserId_WhenClaimIsEmpty_ThrowsInvalidOperationException()
    {
        // Arrange
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, "") };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var act = () => principal.GetUserId();

        // Assert
        act.Should().Throw<Exception>();
    }

    [Fact]
    public void GetRole_ReturnsRoleFromClaim()
    {
        // Arrange
        var principal = CreatePrincipal(role: "Manager");

        // Act
        var role = principal.GetRole();

        // Assert
        role.Should().Be("Manager");
    }

    [Fact]
    public void GetRole_WithDifferentRoles_ReturnsCorrectValue()
    {
        // Arrange
        var developerPrincipal = CreatePrincipal(role: "Developer");
        var managerPrincipal = CreatePrincipal(role: "Manager");
        var adminPrincipal = CreatePrincipal(role: "Admin");

        // Act
        var developerRole = developerPrincipal.GetRole();
        var managerRole = managerPrincipal.GetRole();
        var adminRole = adminPrincipal.GetRole();

        // Assert
        developerRole.Should().Be("Developer");
        managerRole.Should().Be("Manager");
        adminRole.Should().Be("Admin");
    }

    [Fact]
    public void GetRole_WhenClaimMissing_ThrowsInvalidOperationException()
    {
        // Arrange
        var principal = CreatePrincipal(role: null);

        // Act
        var act = () => principal.GetRole();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Role claim is missing from token*");
    }

    [Fact]
    public void GetRole_WhenClaimIsEmpty_ReturnsEmptyString()
    {
        // Arrange
        var claims = new List<Claim> { new(ClaimTypes.Role, "") };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));

        // Act
        var role = principal.GetRole();

        // Assert
        role.Should().Be("");
    }

    [Fact]
    public void BothMethods_CanBeCalledOnSamePrincipal()
    {
        // Arrange
        var principal = CreatePrincipal(userId: 123, role: "Manager");

        // Act
        var userId = principal.GetUserId();
        var role = principal.GetRole();

        // Assert
        userId.Should().Be(123);
        role.Should().Be("Manager");
    }
}
