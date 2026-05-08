using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Roster;

public interface ITeamRosterProvider
{
    Task<IReadOnlyDictionary<int, TeamRosterMember>> LoadRosterAsync(
        int managerId,
        CancellationToken ct);

    Task<bool> IsTeamMemberAsync(
        int managerUserId,
        int candidateUserId,
        CancellationToken ct);
}
