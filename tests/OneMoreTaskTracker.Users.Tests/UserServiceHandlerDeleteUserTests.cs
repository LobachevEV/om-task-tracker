using FluentAssertions;
using Grpc.Core;
using OneMoreTaskTracker.Proto.Users;
using OneMoreTaskTracker.Users.Data;
using OneMoreTaskTracker.Users.Tests.Infra;
using Xunit;

namespace OneMoreTaskTracker.Users.Tests;

public sealed class UserServiceHandlerDeleteUserTests : UserServiceHandlerTestBase
{
    [Fact]
    public async Task DeleteUser_WithValidMemberOfTeam_RemovesUserAndReturnsSuccess()
    {
        var manager = new User { Email = "manager@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.Add(manager);
        await DbContext.SaveChangesAsync();

        var member = new User { Email = "member@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper", ManagerId = manager.Id };
        DbContext.Users.Add(member);
        await DbContext.SaveChangesAsync();

        var request = new DeleteUserRequest { UserId = member.Id, ManagerId = manager.Id };
        var response = await Sut.DeleteUser(request, Ctx);

        response.Should().NotBeNull();
        DbContext.Users.Find(member.Id).Should().BeNull();
    }

    [Fact]
    public async Task DeleteUser_WhenUserNotFound_ThrowsNotFound()
    {
        var request = new DeleteUserRequest { UserId = 9999, ManagerId = 1 };

        var act = () => Sut.DeleteUser(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteUser_WhenUserDoesNotBelongToManager_ThrowsPermissionDenied()
    {
        var manager1 = new User { Email = "manager1@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        var manager2 = new User { Email = "manager2@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.AddRange(manager1, manager2);
        await DbContext.SaveChangesAsync();

        var member = new User { Email = "member@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper", ManagerId = manager1.Id };
        DbContext.Users.Add(member);
        await DbContext.SaveChangesAsync();

        var request = new DeleteUserRequest { UserId = member.Id, ManagerId = manager2.Id };

        var act = () => Sut.DeleteUser(request, Ctx);

        await act.Should().ThrowAsync<RpcException>()
            .Where(e => e.StatusCode == StatusCode.PermissionDenied);
    }

    [Fact]
    public async Task DeleteUser_DoesNotRemoveUserIfManagerIdMismatch()
    {
        var manager1 = new User { Email = "manager1@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        var manager2 = new User { Email = "manager2@example.com", PasswordHash = Password123Hash, Role = "Manager" };
        DbContext.Users.AddRange(manager1, manager2);
        await DbContext.SaveChangesAsync();

        var member = new User { Email = "member@example.com", PasswordHash = Password123Hash, Role = "FrontendDeveloper", ManagerId = manager1.Id };
        DbContext.Users.Add(member);
        await DbContext.SaveChangesAsync();

        var request = new DeleteUserRequest { UserId = member.Id, ManagerId = manager2.Id };

        try
        {
            await Sut.DeleteUser(request, Ctx);
        }
        catch (RpcException)
        {
            // Expected
        }

        // Verify user is NOT deleted
        DbContext.Users.Find(member.Id).Should().NotBeNull();
    }
}
