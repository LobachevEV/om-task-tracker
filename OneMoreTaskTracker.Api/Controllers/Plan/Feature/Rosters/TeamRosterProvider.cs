using Grpc.Core;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Rosters;

public sealed class TeamRosterProvider(
    UserService.UserServiceClient userService,
    ILogger<TeamRosterProvider> logger) : ITeamRosterProvider
{
    private static readonly IReadOnlyDictionary<int, TeamRosterMember> EmptyRoster =
        new Dictionary<int, TeamRosterMember>();

    public async Task<IReadOnlyDictionary<int, TeamRosterMember>> GetRosterForManagerAsync(
        int managerUserId, CancellationToken ct)
    {
        if (managerUserId <= 0)
            return EmptyRoster;

        try
        {
            var roster = await userService.GetTeamRosterAsync(
                new GetTeamRosterRequest { ManagerId = managerUserId },
                cancellationToken: ct);
            return roster.Members.ToDictionary(m => m.UserId);
        }
        catch (RpcException ex)
        {
            logger.LogWarning(ex, "Failed to load roster for manager {ManagerId}", managerUserId);
            return EmptyRoster;
        }
    }

    public async Task<bool> IsTeammateOfManagerAsync(
        int managerUserId, int teammateUserId, CancellationToken ct)
    {
        if (managerUserId <= 0 || teammateUserId <= 0)
            return false;

        try
        {
            var response = await userService.IsTeamMemberAsync(
                new IsTeamMemberRequest { ManagerId = managerUserId, UserId = teammateUserId },
                cancellationToken: ct);
            return response.Exists;
        }
        catch (RpcException ex)
        {
            logger.LogWarning(
                ex,
                "Failed to verify team membership for manager {ManagerId} and user {UserId}",
                managerUserId, teammateUserId);
            return false;
        }
    }
}
