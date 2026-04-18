using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users;
using OneMoreTaskTracker.Users.Data;
using FluentAssertions;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public class UserServiceHandlerTests : IDisposable
{
    private static readonly string Password123Hash =
        BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4);

    private readonly UsersDbContext _dbContext;
    private readonly UserServiceHandler _sut;
    private readonly ServerCallContext _ctx;

    public UserServiceHandlerTests()
    {
        var options = new DbContextOptionsBuilder<UsersDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _dbContext = new UsersDbContext(options);
        _sut = new UserServiceHandler(_dbContext);
        _ctx = Substitute.For<ServerCallContext>();
        _ctx.CancellationToken.Returns(CancellationToken.None);
    }

    public void Dispose() => _dbContext.Dispose();

    #region Register Tests

    [Fact]
    public async Task Register_WhenEmailIsEmpty_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "", Password = "validPassword123" };

        var act = async () => await _sut.Register(request, _ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenPasswordIsEmpty_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "test@example.com", Password = "" };

        var act = async () => await _sut.Register(request, _ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsWhitespace_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "   ", Password = "validPassword123" };

        var act = async () => await _sut.Register(request, _ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsTooLong_ThrowsInvalidArgument()
    {
        var longEmail = new string('a', 255) + "@example.com"; // 255+ chars
        var request = new RegisterRequest { Email = longEmail, Password = "validPassword123" };

        var act = async () => await _sut.Register(request, _ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsInvalid_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest { Email = "notanemail", Password = "validPassword123" };

        var act = async () => await _sut.Register(request, _ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenPasswordTooShort_ThrowsInvalidArgument()
    {
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "short12" // 7 characters, needs 8 minimum
        };

        var act = async () => await _sut.Register(request, _ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ThrowsAlreadyExists()
    {
        var existingUser = new User
        {
            Email = "existing@example.com",
            PasswordHash = Password123Hash,
            Role = "Developer"
        };
        _dbContext.Users.Add(existingUser);
        await _dbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "existing@example.com",
            Password = "newPassword123"
        };

        var act = async () => await _sut.Register(request, _ctx);

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
            ManagerId = 999 // Non-existent manager
        };

        var act = async () => await _sut.Register(request, _ctx);

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
            Role = "Developer"
        };
        _dbContext.Users.Add(existingDeveloper);
        await _dbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "newuser@example.com",
            Password = "validPassword123",
            ManagerId = existingDeveloper.Id
        };

        var act = async () => await _sut.Register(request, _ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WithValidData_ReturnsUserWithDeveloperRole()
    {
        var request = new RegisterRequest
        {
            Email = "newuser@example.com",
            Password = "validPassword123"
        };

        var response = await _sut.Register(request, _ctx);

        response.Should().NotBeNull();
        response.Email.Should().Be("newuser@example.com");
        response.Role.Should().Be("Developer");
        response.UserId.Should().BeGreaterThan(0);

        var savedUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "newuser@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.Role.Should().Be("Developer");
        savedUser.ManagerId.Should().BeNull();
    }

    [Fact]
    public async Task Register_WithValidManagerId_Succeeds()
    {
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = Password123Hash,
            Role = "Manager"
        };
        _dbContext.Users.Add(manager);
        await _dbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "developer@example.com",
            Password = "validPassword123",
            ManagerId = manager.Id
        };

        var response = await _sut.Register(request, _ctx);

        response.Should().NotBeNull();
        response.Email.Should().Be("developer@example.com");
        response.Role.Should().Be("Developer");

        var savedUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "developer@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.ManagerId.Should().Be(manager.Id);
    }

    [Fact]
    public async Task Register_BCryptsHashCorrectly_AndAuthenticateVerifiesRoundTrip()
    {
        const string password = "mySecurePassword123";
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = password
        };

        var registerResponse = await _sut.Register(request, _ctx);

        var savedUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == registerResponse.UserId);
        savedUser.Should().NotBeNull();

        // Verify the hash is not the plain password
        savedUser!.PasswordHash.Should().NotBe(password);

        // Verify we can authenticate with the stored hash
        var authRequest = new AuthenticateRequest { Email = "test@example.com", Password = password };
        var authResponse = await _sut.Authenticate(authRequest, _ctx);

        authResponse.Success.Should().BeTrue();
        authResponse.UserId.Should().Be(registerResponse.UserId);
    }


    #endregion

    #region Authenticate Tests

    [Fact]
    public async Task Authenticate_WithCorrectCredentials_ReturnsSuccess()
    {
        const string password = "password123";
        const string email = "user@example.com";
        var user = new User { Email = email, PasswordHash = Password123Hash, Role = "Developer" };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new AuthenticateRequest { Email = email, Password = password };

        var response = await _sut.Authenticate(request, _ctx);

        response.Should().NotBeNull();
        response.Success.Should().BeTrue();
        response.UserId.Should().Be(user.Id);
        response.Email.Should().Be(email);
        response.Role.Should().Be("Developer");
    }

    [Fact]
    public async Task Authenticate_WithWrongPassword_ReturnsFailure()
    {
        const string email = "user@example.com";
        var user = new User { Email = email, PasswordHash = Password123Hash, Role = "Developer" };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new AuthenticateRequest { Email = email, Password = "wrongpassword" };

        var response = await _sut.Authenticate(request, _ctx);

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

        var response = await _sut.Authenticate(request, _ctx);

        response.Should().NotBeNull();
        response.Success.Should().BeFalse();
    }


    #endregion

    #region GetTeamMemberIds Tests

    [Fact]
    public async Task GetTeamMemberIds_ReturnsIdsOfMembersWithMatchingManagerId()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        _dbContext.Users.Add(manager);
        await _dbContext.SaveChangesAsync();

        var member1 = new User { Email = "member1@example.com", PasswordHash = Password123Hash, Role = "Developer", ManagerId = manager.Id };
        var member2 = new User { Email = "member2@example.com", PasswordHash = Password123Hash, Role = "Developer", ManagerId = manager.Id };
        var otherMember = new User { Email = "other@example.com", PasswordHash = Password123Hash, Role = "Developer", ManagerId = null };

        _dbContext.Users.AddRange(member1, member2, otherMember);
        await _dbContext.SaveChangesAsync();

        var request = new GetTeamMemberIdsRequest { ManagerId = manager.Id };

        var response = await _sut.GetTeamMemberIds(request, _ctx);

        response.Should().NotBeNull();
        response.UserIds.Should().HaveCount(2);
        response.UserIds.Should().Contain(new[] { member1.Id, member2.Id });
        response.UserIds.Should().NotContain(otherMember.Id);
    }

    [Fact]
    public async Task GetTeamMemberIds_WhenNoMembers_ReturnsEmptyList()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        _dbContext.Users.Add(manager);
        await _dbContext.SaveChangesAsync();

        var request = new GetTeamMemberIdsRequest { ManagerId = manager.Id };

        var response = await _sut.GetTeamMemberIds(request, _ctx);

        response.Should().NotBeNull();
        response.UserIds.Should().BeEmpty();
    }


    #endregion
}
