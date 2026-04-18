using FluentAssertions;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public sealed class UserServiceHandlerAuthenticateTests : UserServiceHandlerTestBase
{
    [Fact]
    public async Task Authenticate_WithCorrectCredentials_ReturnsSuccess()
    {
        const string password = "password123";
        const string email = "user@example.com";
        var user = new User { Email = email, PasswordHash = Password123Hash, Role = "FrontendDeveloper" };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();

        var request = new AuthenticateRequest { Email = email, Password = password };

        var response = await Sut.Authenticate(request, Ctx);

        response.Should().NotBeNull();
        response.Success.Should().BeTrue();
        response.UserId.Should().Be(user.Id);
        response.Email.Should().Be(email);
        response.Role.Should().Be("FrontendDeveloper");
    }

    [Fact]
    public async Task Authenticate_WithWrongPassword_ReturnsFailure()
    {
        const string email = "user@example.com";
        var user = new User { Email = email, PasswordHash = Password123Hash, Role = "FrontendDeveloper" };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();

        var request = new AuthenticateRequest { Email = email, Password = "wrongpassword" };

        var response = await Sut.Authenticate(request, Ctx);

        response.Should().NotBeNull();
        response.Success.Should().BeFalse();
    }

    [Fact]
    public async Task Authenticate_WithNonExistentEmail_ReturnsFailure()
    {
        var request = new AuthenticateRequest
        {
            Email = "nonexistent@example.com",
            Password = "password123"
        };

        var response = await Sut.Authenticate(request, Ctx);

        response.Should().NotBeNull();
        response.Success.Should().BeFalse();
    }
}
