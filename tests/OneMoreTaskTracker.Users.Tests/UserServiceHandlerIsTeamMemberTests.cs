using FluentAssertions;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public sealed class UserServiceHandlerIsTeamMemberTests : UserServiceHandlerTestBase
{
    [Fact]
    public async Task IsTeamMember_ReturnsTrue_WhenUserBelongsToManager()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var member = new User { Email = "member@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper", ManagerId = manager.Id };
        DbContext.Users.Add(member);
        await DbContext.SaveChangesAsync();

        var response = await Sut.IsTeamMember(
            new IsTeamMemberRequest { ManagerId = manager.Id, UserId = member.Id }, Ctx);

        response.Exists.Should().BeTrue();
    }

    [Fact]
    public async Task IsTeamMember_ReturnsFalse_WhenUserBelongsToDifferentManager()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        var otherManager = new User { Email = "other@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.AddRange(manager, otherManager);
        await DbContext.SaveChangesAsync();

        var stranger = new User { Email = "stranger@example.com", PasswordHash = Password123Hash, Role = "BackendDeveloper", ManagerId = otherManager.Id };
        DbContext.Users.Add(stranger);
        await DbContext.SaveChangesAsync();

        var response = await Sut.IsTeamMember(
            new IsTeamMemberRequest { ManagerId = manager.Id, UserId = stranger.Id }, Ctx);

        response.Exists.Should().BeFalse();
    }

    [Fact]
    public async Task IsTeamMember_ReturnsFalse_WhenUserDoesNotExist()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var response = await Sut.IsTeamMember(
            new IsTeamMemberRequest { ManagerId = manager.Id, UserId = 99_999 }, Ctx);

        response.Exists.Should().BeFalse();
    }

    [Fact]
    public async Task IsTeamMember_ReturnsFalse_WhenManagerIdIsZero()
    {
        var orphan = new User { Email = "orphan@example.com", PasswordHash = Password123Hash, Role = "Qa", ManagerId = null };
        DbContext.Users.Add(orphan);
        await DbContext.SaveChangesAsync();

        var response = await Sut.IsTeamMember(
            new IsTeamMemberRequest { ManagerId = 0, UserId = orphan.Id }, Ctx);

        response.Exists.Should().BeFalse();
    }
}
