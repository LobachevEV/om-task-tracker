using FluentAssertions;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public sealed class UserServiceHandlerIsTeamMemberTests : UserServiceHandlerTestBase
{
    [Fact]
    public async Task IsTeamMember_WhenMemberBelongsToManager_ReturnsTrue()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var member = new User { Email = "member@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper", ManagerId = manager.Id };
        DbContext.Users.Add(member);
        await DbContext.SaveChangesAsync();

        var request = new IsTeamMemberRequest { ManagerUserId = manager.Id, MemberUserId = member.Id };
        var response = await Sut.IsTeamMember(request, Ctx);

        response.IsMember.Should().BeTrue();
    }

    [Fact]
    public async Task IsTeamMember_WhenManagerQueriesThemselves_ReturnsTrue()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new IsTeamMemberRequest { ManagerUserId = manager.Id, MemberUserId = manager.Id };
        var response = await Sut.IsTeamMember(request, Ctx);

        response.IsMember.Should().BeTrue();
    }

    [Fact]
    public async Task IsTeamMember_WhenMemberBelongsToDifferentManager_ReturnsFalse()
    {
        var manager1 = new User { Email = "manager1@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        var manager2 = new User { Email = "manager2@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.AddRange(manager1, manager2);
        await DbContext.SaveChangesAsync();

        var member = new User { Email = "member@example.com", PasswordHash = Password123Hash, Role = "BackendDeveloper", ManagerId = manager2.Id };
        DbContext.Users.Add(member);
        await DbContext.SaveChangesAsync();

        var request = new IsTeamMemberRequest { ManagerUserId = manager1.Id, MemberUserId = member.Id };
        var response = await Sut.IsTeamMember(request, Ctx);

        response.IsMember.Should().BeFalse();
    }

    [Fact]
    public async Task IsTeamMember_WhenMemberUserIdDoesNotExist_ReturnsFalse()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new IsTeamMemberRequest { ManagerUserId = manager.Id, MemberUserId = 99999 };
        var response = await Sut.IsTeamMember(request, Ctx);

        response.IsMember.Should().BeFalse();
    }
}
