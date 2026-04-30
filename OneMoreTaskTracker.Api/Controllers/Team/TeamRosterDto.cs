using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Team;

public sealed record TeamRosterDto(
    int UserId,
    string Email,
    string Role,
    int? ManagerId,
    string DisplayName,
    bool IsSelf,
    UserStatusDto Status)
{
    internal static TeamRosterDto From(
        TeamRosterMember member,
        int callerId,
        IReadOnlyDictionary<int, AssigneeTaskSummary> statusMap)
    {
        statusMap.TryGetValue(member.UserId, out var status);
        return new TeamRosterDto(
            UserId: member.UserId,
            Email: member.Email,
            Role: member.Role,
            ManagerId: member.ManagerId == 0 ? null : member.ManagerId,
            DisplayName: DisplayNameHelper.ExtractDisplayName(member.Email),
            IsSelf: member.UserId == callerId,
            Status: UserStatusDto.From(status));
    }
}
