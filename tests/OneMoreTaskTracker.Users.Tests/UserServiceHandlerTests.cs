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
        // Arrange
        var request = new RegisterRequest
        {
            Email = "",
            Password = "validPassword123"
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenPasswordIsEmpty_ThrowsInvalidArgument()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = ""
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsWhitespace_ThrowsInvalidArgument()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "   ",
            Password = "validPassword123"
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsTooLong_ThrowsInvalidArgument()
    {
        // Arrange
        var longEmail = new string('a', 255) + "@example.com"; // 255+ chars
        var request = new RegisterRequest
        {
            Email = longEmail,
            Password = "validPassword123"
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailIsInvalid_ThrowsInvalidArgument()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "notanemail",
            Password = "validPassword123"
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenPasswordTooShort_ThrowsInvalidArgument()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "short12" // 7 characters, needs 8 minimum
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ThrowsAlreadyExists()
    {
        // Arrange
        var existingUser = new User
        {
            Email = "existing@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
            Role = "Developer"
        };
        _dbContext.Users.Add(existingUser);
        await _dbContext.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "existing@example.com",
            Password = "newPassword123"
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.AlreadyExists);
    }

    [Fact]
    public async Task Register_WhenManagerIdIsNonZeroButNotFound_ThrowsInvalidArgument()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "validPassword123",
            ManagerId = 999 // Non-existent manager
        };

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WhenManagerIdRefersToNonManager_ThrowsInvalidArgument()
    {
        // Arrange
        var existingDeveloper = new User
        {
            Email = "developer@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
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

        // Act
        var act = async () => await _sut.Register(request, _ctx);

        // Assert
        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task Register_WithValidData_ReturnsUserWithDeveloperRole()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "newuser@example.com",
            Password = "validPassword123"
        };

        // Act
        var response = await _sut.Register(request, _ctx);

        // Assert
        response.Should().NotBeNull();
        response.Email.Should().Be("newuser@example.com");
        response.Role.Should().Be("Developer");
        response.UserId.Should().BeGreaterThan(0);

        // Verify user was persisted
        var savedUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "newuser@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.Role.Should().Be("Developer");
        savedUser.ManagerId.Should().BeNull();
    }

    [Fact]
    public async Task Register_WithValidManagerId_Succeeds()
    {
        // Arrange
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
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

        // Act
        var response = await _sut.Register(request, _ctx);

        // Assert
        response.Should().NotBeNull();
        response.Email.Should().Be("developer@example.com");
        response.Role.Should().Be("Developer");

        // Verify manager assignment was persisted
        var savedUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "developer@example.com");
        savedUser.Should().NotBeNull();
        savedUser!.ManagerId.Should().Be(manager.Id);
    }

    #endregion

    #region Authenticate Tests

    [Fact]
    public async Task Authenticate_WithCorrectCredentials_ReturnsSuccess()
    {
        // Arrange
        const string password = "password123";
        const string email = "user@example.com";
        var hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 4);
        var user = new User
        {
            Email = email,
            PasswordHash = hash,
            Role = "Developer"
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new AuthenticateRequest
        {
            Email = email,
            Password = password
        };

        // Act
        var response = await _sut.Authenticate(request, _ctx);

        // Assert
        response.Should().NotBeNull();
        response.Success.Should().BeTrue();
        response.UserId.Should().Be(user.Id);
        response.Email.Should().Be(email);
        response.Role.Should().Be("Developer");
    }

    [Fact]
    public async Task Authenticate_WithWrongPassword_ReturnsFailure()
    {
        // Arrange
        const string correctPassword = "password123";
        const string wrongPassword = "wrongpassword";
        const string email = "user@example.com";
        var hash = BCrypt.Net.BCrypt.HashPassword(correctPassword, workFactor: 4);
        var user = new User
        {
            Email = email,
            PasswordHash = hash,
            Role = "Developer"
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new AuthenticateRequest
        {
            Email = email,
            Password = wrongPassword
        };

        // Act
        var response = await _sut.Authenticate(request, _ctx);

        // Assert
        response.Should().NotBeNull();
        response.Success.Should().BeFalse();
    }

    [Fact]
    public async Task Authenticate_WithNonExistentEmail_ReturnsFailure()
    {
        // Arrange
        var request = new AuthenticateRequest
        {
            Email = "nonexistent@example.com",
            Password = "password123"
        };

        // Act
        var response = await _sut.Authenticate(request, _ctx);

        // Assert
        response.Should().NotBeNull();
        response.Success.Should().BeFalse();
    }

    #endregion

    #region GetTeamMemberIds Tests

    [Fact]
    public async Task GetTeamMemberIds_ReturnsIdsOfMembersWithMatchingManagerId()
    {
        // Arrange
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
            Role = "Manager"
        };
        _dbContext.Users.Add(manager);
        await _dbContext.SaveChangesAsync();

        var member1 = new User
        {
            Email = "member1@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
            Role = "Developer",
            ManagerId = manager.Id
        };
        var member2 = new User
        {
            Email = "member2@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
            Role = "Developer",
            ManagerId = manager.Id
        };
        var otherMember = new User
        {
            Email = "other@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
            Role = "Developer",
            ManagerId = null
        };

        _dbContext.Users.AddRange(member1, member2, otherMember);
        await _dbContext.SaveChangesAsync();

        var request = new GetTeamMemberIdsRequest { ManagerId = manager.Id };

        // Act
        var response = await _sut.GetTeamMemberIds(request, _ctx);

        // Assert
        response.Should().NotBeNull();
        response.UserIds.Should().HaveCount(2);
        response.UserIds.Should().Contain(new[] { member1.Id, member2.Id });
        response.UserIds.Should().NotContain(otherMember.Id);
    }

    [Fact]
    public async Task GetTeamMemberIds_WhenNoMembers_ReturnsEmptyList()
    {
        // Arrange
        var manager = new User
        {
            Email = "manager@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4),
            Role = "Manager"
        };
        _dbContext.Users.Add(manager);
        await _dbContext.SaveChangesAsync();

        var request = new GetTeamMemberIdsRequest { ManagerId = manager.Id };

        // Act
        var response = await _sut.GetTeamMemberIds(request, _ctx);

        // Assert
        response.Should().NotBeNull();
        response.UserIds.Should().BeEmpty();
    }

    #endregion
}
