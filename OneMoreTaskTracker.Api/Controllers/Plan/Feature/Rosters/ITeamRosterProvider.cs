using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Rosters;

public interface ITeamRosterProvider
{
    Task<IReadOnlyDictionary<int, TeamRosterMember>> GetRosterForManagerAsync(int managerUserId, CancellationToken ct);

    Task<bool> IsTeammateOfManagerAsync(int managerUserId, int teammateUserId, CancellationToken ct);
}
