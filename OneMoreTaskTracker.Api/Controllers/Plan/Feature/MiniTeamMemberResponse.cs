using OneMoreTaskTracker.Api.Controllers;
using OneMoreTaskTracker.Proto.Users;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature;

public record MiniTeamMemberResponse(int UserId, string Email, string DisplayName, string Role)
{
    internal static MiniTeamMemberResponse From(int userId, IReadOnlyDictionary<int, TeamRosterMember> roster)
    {
        if (userId <= 0)
            return new MiniTeamMemberResponse(0, string.Empty, string.Empty, string.Empty);

        if (roster.TryGetValue(userId, out var member))
            return new MiniTeamMemberResponse(
                member.UserId,
                member.Email,
                DisplayNameHelper.ExtractDisplayName(member.Email),
                member.Role);

        return new MiniTeamMemberResponse(userId, string.Empty, string.Empty, string.Empty);
    }
}
