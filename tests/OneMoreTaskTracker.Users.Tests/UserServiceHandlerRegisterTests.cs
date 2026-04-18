using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Services;
using OneMoreTaskTracker.Users.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public sealed class UserServiceHandlerRegisterTests : UserServiceHandlerTestBase
{
    [Fact]
    public async Task Register_WhenEmailIsEmpty_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "", Password = "validPassword123" };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenPasswordIsEmpty_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "test@example.com", Password = "" };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsWhitespace_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "   ", Password = "validPassword123" };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsTooLong_ThrowsInvalidArgument()
    {
        var longEmail = new string('a', 255) + "@example.com";
        var request = new RegisterRequest { Email = longEmail, Password = "validPassword123" };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsInvalid_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "notanemail", Password = "validPassword123" };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenPasswordTooShort_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "short12"
        };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ThrowsAlreadyExists()
    {
        DbContext.Users.Add(new User
        {
            Email = "existing@example.com",
            PasswordHash = Password123Hash,
            Role = "FrontendDeveloper"
        });
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "existing@example.com",
            Password = "newPassword123"
        };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.AlreadyExists);
    }

    [Fact]
    public async Task Register_WhenManagerIdIsNonZeroButNotFound_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "validPassword123",
            ManagerId = 999
        };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenManagerIdRefersToNonManager_ThrowsInvalidArgument()
    {
        var existingDeveloper = new User
        {
            Email = "developer@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.FrontendDeveloper
        };
        DbContext.Users.Add(existingDeveloper);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "newuser@example.com",
            Password = "validPassword123",
            ManagerId = existingDeveloper.Id,
            Role = Roles.BackendDeveloper
        };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WithValidData_ReturnsUserWithManagerRole()
    {
        var request = new RegisterRequest
        {
            Email = "newuser@example.com",
            Password = "validPassword123"
        };

        var response = await Sut.Register(request, Ctx);

        response.Should().NotBeNull();
        response.Email.Should().Be("newuser@example.com");
        response.Role.Should().Be(Roles.Manager);
        response.UserId.Should().BeGreaterThan(0);

        var savedUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == "newuser@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.Role.Should().Be(Roles.Manager);
        savedUser.ManagerId.Should().BeNull();
    }

    [Fact]
    public async Task Register_WithValidManagerId_Succeeds()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.Manager
        };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "developer@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id,
            Role = Roles.FrontendDeveloper
        };

        var response = await Sut.Register(request, Ctx);

        response.Should().NotBeNull();
        response.Email.Should().Be("developer@example.com");
        response.Role.Should().Be(Roles.FrontendDeveloper);

        var savedUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == "developer@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.ManagerId.Should().Be(manager.Id);
    }

    [Fact]
    public async Task Register_BCryptsHashCorrectly_AndAuthenticateVerifiesRoundTrip()
    {
        const string password = "mySecurePassword123";
        var request = new RegisterRequest { Email = "test@example.com", Password = password };

        var registerResponse = await Sut.Register(request, Ctx);

        var savedUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Id == registerResponse.UserId);
        savedUser.Should().NotBeNull();
        savedUser!.PasswordHash.Should().NotBe(password);

        var authRequest = new AuthenticateRequest { Email = "test@example.com", Password = password };
        var authResponse = await Sut.Authenticate(authRequest, Ctx);

        authResponse.Success.Should().BeTrue();
        authResponse.UserId.Should().Be(registerResponse.UserId);
    }

    [Fact]
    public async Task Register_SelfRegistration_ForcesManagerRole_IgnoresSentRole()
    {
        var request = new RegisterRequest
        {
            Email = "selfregister@example.com",
            Password = "validPassword123",
            ManagerId = 0,
            Role = "FrontendDeveloper"
        };

        var response = await Sut.Register(request, Ctx);

        response.Role.Should().Be(Roles.Manager);

        var savedUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == "selfregister@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.Role.Should().Be(Roles.Manager);
        savedUser.ManagerId.Should().BeNull();
    }

    [Fact]
    public async Task Register_ManagedCreation_RequiresValidDeveloperRole_RejectsManager()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.Manager
        };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "newdev@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id,
            Role = Roles.Manager
        };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_ManagedCreation_RequiresValidDeveloperRole_RejectsEmpty()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.Manager
        };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "newdev@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id,
            Role = ""
        };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_ManagedCreation_AcceptsFrontendDeveloper()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.Manager
        };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "frontend@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id,
            Role = Roles.FrontendDeveloper
        };

        var response = await Sut.Register(request, Ctx);

        response.Role.Should().Be(Roles.FrontendDeveloper);

        var savedUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == "frontend@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.Role.Should().Be(Roles.FrontendDeveloper);
        savedUser.ManagerId.Should().Be(manager.Id);
    }

    [Fact]
    public async Task Register_ManagedCreation_AcceptsBackendDeveloper()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.Manager
        };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "backend@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id,
            Role = Roles.BackendDeveloper
        };

        var response = await Sut.Register(request, Ctx);

        response.Role.Should().Be(Roles.BackendDeveloper);

        var savedUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == "backend@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.Role.Should().Be(Roles.BackendDeveloper);
        savedUser.ManagerId.Should().Be(manager.Id);
    }

    [Fact]
    public async Task Register_ManagedCreation_AcceptsQa()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.Manager
        };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "qa@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id,
            Role = Roles.Qa
        };

        var response = await Sut.Register(request, Ctx);

        response.Role.Should().Be(Roles.Qa);

        var savedUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Email == "qa@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.Role.Should().Be(Roles.Qa);
        savedUser.ManagerId.Should().Be(manager.Id);
    }

    [Fact]
    public async Task Register_ManagedCreation_RejectsArbitraryRole()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = Roles.Manager
        };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "newdev@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id,
            Role = "Admin"
        };

        var act = async () => await Sut.Register(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }
}
