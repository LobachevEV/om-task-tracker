using FluentAssertions;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public sealed class UserServiceHandlerGetTeamMemberIdsTests : UserServiceHandlerTestBase
{
    [Fact]
    public async Task GetTeamMemberIds_ReturnsIdsOfMembersWithMatchingManagerId()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var member1 = new User { Email = "member1@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper", ManagerId = manager.Id };
        var member2 = new User { Email = "member2@example.com", PasswordHash = Password123Hash, Role = "BackendDeveloper", ManagerId = manager.Id };
        var otherMember = new User { Email = "other@example.com", PasswordHash = Password123Hash, Role = "Qa", ManagerId = null };

        DbContext.Users.AddRange(member1, member2, otherMember);
        await DbContext.SaveChangesAsync();

        var request = new GetTeamMemberIdsRequest { ManagerId = manager.Id };

        var response = await Sut.GetTeamMemberIds(request, Ctx);

        response.Should().NotBeNull();
        response.UserIds.Should().HaveCount(2);
        response.UserIds.Should().Contain(new[] { member1.Id, member2.Id });
        response.UserIds.Should().NotContain(otherMember.Id);
    }

    [Fact]
    public async Task GetTeamMemberIds_WhenNoMembers_ReturnsEmptyList()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new GetTeamMemberIdsRequest { ManagerId = manager.Id };

        var response = await Sut.GetTeamMemberIds(request, Ctx);

        response.Should().NotBeNull();
        response.UserIds.Should().BeEmpty();
    }
}
