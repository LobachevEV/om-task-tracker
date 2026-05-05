using FluentAssertions;
using Grpc.Core;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using OneMoreTaskTracker.Api.Controllers.Plan.Feature.Rosters;
using OneMoreTaskTracker.Api.Tests.Infra;
using OneMoreTaskTracker.Proto.Users;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers.Plan.Feature.Rosters;

public sealed class TeamRosterProviderTests
{
    private const int ManagerId = 7;
    private const int TeammateId = 11;

    private static (TeamRosterProvider sut, UserService.UserServiceClient userService) BuildSut()
    {
        var userService = Substitute.For<UserService.UserServiceClient>();
        var sut = new TeamRosterProvider(userService, NullLogger<TeamRosterProvider>.Instance);
        return (sut, userService);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetRosterForManagerAsync_ReturnsEmpty_WhenManagerIdIsNotPositive(int managerId)
    {
        var (sut, userService) = BuildSut();

        var result = await sut.GetRosterForManagerAsync(managerId, CancellationToken.None);

        result.Should().BeEmpty();
        _ = userService.DidNotReceive().GetTeamRosterAsync(
            Arg.Any<GetTeamRosterRequest>(),
            Arg.Any<Metadata>(),
            Arg.Any<DateTime?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetRosterForManagerAsync_ReturnsEmpty_WhenGrpcThrowsRpcException()
    {
        var (sut, userService) = BuildSut();
        userService
            .GetTeamRosterAsync(
                Arg.Any<GetTeamRosterRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Throws(new RpcException(new Status(StatusCode.Unavailable, "boom")));

        var result = await sut.GetRosterForManagerAsync(ManagerId, CancellationToken.None);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetRosterForManagerAsync_ReturnsKeyedDictionary_OnSuccess()
    {
        var (sut, userService) = BuildSut();
        var roster = new GetTeamRosterResponse();
        roster.Members.Add(new TeamRosterMember
        {
            UserId = TeammateId,
            Email = "user@example.com",
            Role = "FrontendDeveloper",
            ManagerId = ManagerId
        });
        userService
            .GetTeamRosterAsync(
                Arg.Is<GetTeamRosterRequest>(r => r.ManagerId == ManagerId),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(roster));

        var result = await sut.GetRosterForManagerAsync(ManagerId, CancellationToken.None);

        result.Should().ContainKey(TeammateId);
        result[TeammateId].Email.Should().Be("user@example.com");
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(-1, 1)]
    [InlineData(1, 0)]
    [InlineData(1, -1)]
    public async Task IsTeammateOfManagerAsync_ReturnsFalse_WhenEitherIdIsNotPositive(int managerId, int teammateId)
    {
        var (sut, userService) = BuildSut();

        var result = await sut.IsTeammateOfManagerAsync(managerId, teammateId, CancellationToken.None);

        result.Should().BeFalse();
        _ = userService.DidNotReceive().IsTeamMemberAsync(
            Arg.Any<IsTeamMemberRequest>(),
            Arg.Any<Metadata>(),
            Arg.Any<DateTime?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task IsTeammateOfManagerAsync_ReturnsFalse_WhenGrpcThrowsRpcException()
    {
        var (sut, userService) = BuildSut();
        userService
            .IsTeamMemberAsync(
                Arg.Any<IsTeamMemberRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Throws(new RpcException(new Status(StatusCode.Unavailable, "boom")));

        var result = await sut.IsTeammateOfManagerAsync(ManagerId, TeammateId, CancellationToken.None);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsTeammateOfManagerAsync_ReturnsTrue_WhenRpcReportsExists()
    {
        var (sut, userService) = BuildSut();
        userService
            .IsTeamMemberAsync(
                Arg.Is<IsTeamMemberRequest>(r => r.ManagerId == ManagerId && r.UserId == TeammateId),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new IsTeamMemberResponse { Exists = true }));

        var result = await sut.IsTeammateOfManagerAsync(ManagerId, TeammateId, CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsTeammateOfManagerAsync_ReturnsFalse_WhenRpcReportsNotExists()
    {
        var (sut, userService) = BuildSut();
        userService
            .IsTeamMemberAsync(
                Arg.Any<IsTeamMemberRequest>(),
                Arg.Any<Metadata>(),
                Arg.Any<DateTime?>(),
                Arg.Any<CancellationToken>())
            .Returns(GrpcTestHelpers.UnaryCall(new IsTeamMemberResponse { Exists = false }));

        var result = await sut.IsTeammateOfManagerAsync(ManagerId, TeammateId, CancellationToken.None);

        result.Should().BeFalse();
    }
}
