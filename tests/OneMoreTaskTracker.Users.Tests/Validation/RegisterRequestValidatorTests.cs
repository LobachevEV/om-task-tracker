using FluentAssertions;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Services;
using OneMoreTaskTracker.Users.Validators;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests.Validation;

public sealed class RegisterRequestValidatorTests
{
    [Fact]
    public async Task Validate_WhenEmailIsEmpty_FailsWithEmailAndPasswordRequired()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest { Email = "", Password = "validPassword123" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage == "Email and password are required");
    }

    [Fact]
    public async Task Validate_WhenEmailIsWhitespace_FailsWithEmailAndPasswordRequired()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest { Email = "   ", Password = "validPassword123" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage == "Email and password are required");
    }

    [Fact]
    public async Task Validate_WhenPasswordIsEmpty_FailsWithEmailAndPasswordRequired()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest { Email = "test@example.com", Password = "" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage == "Email and password are required");
    }

    [Fact]
    public async Task Validate_WhenEmailExceedsMaxLength_FailsWithInvalidEmailAddress()
    {
        var validator = new RegisterRequestValidator();
        var longEmail = new string('a', 255) + "@example.com";
        var request = new RegisterRequest { Email = longEmail, Password = "validPassword123" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Invalid email address");
    }

    [Fact]
    public async Task Validate_WhenEmailIsMalformed_FailsWithInvalidEmailAddress()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest { Email = "notanemail", Password = "validPassword123" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Invalid email address");
    }

    [Fact]
    public async Task Validate_WhenPasswordTooShort_FailsWithMinimumLengthMessage()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest { Email = "test@example.com", Password = "short12" };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Password must be at least 8 characters");
    }

    [Fact]
    public async Task Validate_WhenManagedCreationWithInvalidRole_FailsWithRoleTaxonomyMessage()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "validPassword123",
            ManagerId = 1,
            Role = "Admin"
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Role must be one of: FrontendDeveloper, BackendDeveloper, Qa");
    }

    [Fact]
    public async Task Validate_WhenManagedCreationWithEmptyRole_FailsWithRoleTaxonomyMessage()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "validPassword123",
            ManagerId = 1,
            Role = ""
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Role must be one of: FrontendDeveloper, BackendDeveloper, Qa");
    }

    [Theory]
    [InlineData(Roles.FrontendDeveloper)]
    [InlineData(Roles.BackendDeveloper)]
    [InlineData(Roles.Qa)]
    public async Task Validate_WhenManagedCreationWithDeveloperRole_Passes(string role)
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest
        {
            Email = "dev@example.com",
            Password = "validPassword123",
            ManagerId = 1,
            Role = role
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WhenSelfRegistrationIgnoresRole_Passes()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest
        {
            Email = "self@example.com",
            Password = "validPassword123",
            ManagerId = 0,
            Role = "Anything"
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithFullyValidSelfRegistration_Passes()
    {
        var validator = new RegisterRequestValidator();
        var request = new RegisterRequest
        {
            Email = "self@example.com",
            Password = "validPassword123"
        };

        var result = await validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }
}
