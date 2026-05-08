using Grpc.Core;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Roster;

public sealed class TeamRosterProvider(
    UserService.UserServiceClient userService,
    ILogger<TeamRosterProvider> logger) : ITeamRosterProvider
{
    public async Task<IReadOnlyDictionary<int, TeamRosterMember>> LoadRosterAsync(
        int managerId,
        CancellationToken ct)
    {
        if (managerId <= 0)
            return new Dictionary<int, TeamRosterMember>();

        try
        {
            var roster = await userService.GetTeamRosterAsync(
                new GetTeamRosterRequest { ManagerId = managerId },
                cancellationToken: ct);
            return (roster.Members ?? []).ToDictionary(m => m.UserId);
        }
        catch (RpcException ex)
        {
            logger.LogWarning(ex, "Failed to load roster for manager {ManagerId}", managerId);
            return new Dictionary<int, TeamRosterMember>();
        }
    }

    public async Task<bool> IsTeamMemberAsync(
        int managerUserId,
        int candidateUserId,
        CancellationToken ct)
    {
        if (managerUserId <= 0 || candidateUserId <= 0)
            return false;

        try
        {
            var response = await userService.IsTeamMemberAsync(
                new IsTeamMemberRequest
                {
                    ManagerUserId = managerUserId,
                    MemberUserId = candidateUserId
                },
                cancellationToken: ct);
            return response.IsMember;
        }
        catch (RpcException ex)
        {
            logger.LogWarning(ex, "IsTeamMember check failed for manager {ManagerUserId}, candidate {CandidateUserId}",
                managerUserId, candidateUserId);
            return false;
        }
    }
}
