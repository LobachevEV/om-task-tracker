using FluentAssertions;
using OneMoreTaskTracker.Api.Auth;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Auth;

public sealed class RolesTests
{
    [Fact]
    public void Manager_HasCorrectValue()
    {
        Roles.Manager.Should().Be("Manager");
    }

    [Fact]
    public void FrontendDeveloper_HasCorrectValue()
    {
        Roles.FrontendDeveloper.Should().Be("FrontendDeveloper");
    }

    [Fact]
    public void BackendDeveloper_HasCorrectValue()
    {
        Roles.BackendDeveloper.Should().Be("BackendDeveloper");
    }

    [Fact]
    public void Qa_HasCorrectValue()
    {
        Roles.Qa.Should().Be("Qa");
    }

    [Fact]
    public void DeveloperRoles_ContainsExactlyThreeRoles()
    {
        Roles.DeveloperRoles.Should().HaveCount(3);
    }

    [Theory]
    [InlineData("FrontendDeveloper")]
    [InlineData("BackendDeveloper")]
    [InlineData("Qa")]
    public void DeveloperRoles_ContainsExpectedRoles(string role)
    {
        Roles.DeveloperRoles.Should().Contain(role);
    }

    [Theory]
    [InlineData("Manager")]
    [InlineData("FrontendDeveloper")]
    [InlineData("BackendDeveloper")]
    [InlineData("Qa")]
    public void IsValid_ReturnsTrueForValidRoles(string role)
    {
        Roles.IsValid(role).Should().BeTrue();
    }

    [Theory]
    [InlineData("Developer")]
    [InlineData("Admin")]
    [InlineData("User")]
    [InlineData("")]
    public void IsValid_ReturnsFalseForInvalidRoles(string role)
    {
        Roles.IsValid(role).Should().BeFalse();
    }

    [Fact]
    public void IsValid_ReturnsFalseForNull()
    {
        Roles.IsValid(null).Should().BeFalse();
    }

    [Fact]
    public void DeveloperRoles_DoesNotContainManager()
    {
        Roles.DeveloperRoles.Should().NotContain("Manager");
    }

    [Fact]
    public void DeveloperRoles_IsReadOnly()
    {
        // IReadOnlySet<T> doesn't support mutation methods
        Roles.DeveloperRoles.Should().BeAssignableTo<IReadOnlySet<string>>();
    }
}
