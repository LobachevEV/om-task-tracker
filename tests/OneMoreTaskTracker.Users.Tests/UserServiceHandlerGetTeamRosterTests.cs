using FluentAssertions;
using Grpc.Core;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public sealed class UserServiceHandlerGetTeamRosterTests : UserServiceHandlerTestBase
{
    [Fact]
    public async Task GetTeamRoster_ReturnsManagerRowPlusAllDirectReports()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var member1 = new User { Email = "member1@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper", ManagerId = manager.Id };
        var member2 = new User { Email = "member2@example.com", PasswordHash = Password123Hash, Role = "BackendDeveloper", ManagerId = manager.Id };
        DbContext.Users.AddRange(member1, member2);
        await DbContext.SaveChangesAsync();

        var request = new GetTeamRosterRequest { ManagerId = manager.Id };
        var response = await Sut.GetTeamRoster(request, Ctx);

        response.Members.Should().HaveCount(3);

        // Manager row should have managerId = 0 (null equivalent in proto)
        var managerRow = response.Members.First(m => m.UserId == manager.Id);
        managerRow.Email.Should().Be("manager@example.com");
        managerRow.Role.Should().Be("Manager");
        managerRow.ManagerId.Should().Be(0);

        // Member rows
        response.Members.Should().Contain(m => m.UserId == member1.Id && m.Email == "member1@example.com");
        response.Members.Should().Contain(m => m.UserId == member2.Id && m.Email == "member2@example.com");
    }

    [Fact]
    public async Task GetTeamRoster_WhenManagerHasNoMembers_ReturnsOnlyManagerRow()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var request = new GetTeamRosterRequest { ManagerId = manager.Id };
        var response = await Sut.GetTeamRoster(request, Ctx);

        response.Members.Should().HaveCount(1);
        response.Members.First().UserId.Should().Be(manager.Id);
        response.Members.First().Role.Should().Be("Manager");
    }

    [Fact]
    public async Task GetTeamRoster_WhenManagerIdNotFound_ThrowsInvalidArgument()
    {
        var request = new GetTeamRosterRequest { ManagerId = 9999 };

        var act = () => Sut.GetTeamRoster(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }

    [Fact]
    public async Task GetTeamRoster_WhenManagerIdRefersToNonManager_ThrowsInvalidArgument()
    {
        var developer = new User { Email = "dev@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper" };
        DbContext.Users.Add(developer);
        await DbContext.SaveChangesAsync();

        var request = new GetTeamRosterRequest { ManagerId = developer.Id };

        var act = () => Sut.GetTeamRoster(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.InvalidArgument);
    }
}
