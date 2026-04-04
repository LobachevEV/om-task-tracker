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

    [Theory]
    [InlineData(1)]
    [InlineData(42)]
    [InlineData(9999)]
    public void GetUserId_ReturnsCorrectValue(int expectedId)
    {
        var principal = CreatePrincipal(userId: expectedId);
        principal.GetUserId().Should().Be(expectedId);
    }

    [Fact]
    public void GetUserId_WhenClaimMissing_ThrowsInvalidOperationException()
    {
        var principal = CreatePrincipal(userId: null);
        var act = () => principal.GetUserId();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*NameIdentifier claim is missing from token*");
    }

    [Fact]
    public void GetUserId_WhenClaimIsEmpty_Throws()
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, "") };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));
        var act = () => principal.GetUserId();
        act.Should().Throw<Exception>();
    }

    [Theory]
    [InlineData("Developer")]
    [InlineData("Manager")]
    [InlineData("Admin")]
    public void GetRole_ReturnsCorrectValue(string expectedRole)
    {
        var principal = CreatePrincipal(role: expectedRole);
        principal.GetRole().Should().Be(expectedRole);
    }

    [Fact]
    public void GetRole_WhenClaimMissing_ThrowsInvalidOperationException()
    {
        var principal = CreatePrincipal(role: null);
        var act = () => principal.GetRole();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Role claim is missing from token*");
    }

    [Fact]
    public void GetRole_WhenClaimIsEmpty_ReturnsEmptyString()
    {
        var claims = new List<Claim> { new(ClaimTypes.Role, "") };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));
        principal.GetRole().Should().Be("");
    }

    [Fact]
    public void BothMethods_CanBeCalledOnSamePrincipal()
    {
        var principal = CreatePrincipal(userId: 123, role: "Manager");
        principal.GetUserId().Should().Be(123);
        principal.GetRole().Should().Be("Manager");
    }
}
