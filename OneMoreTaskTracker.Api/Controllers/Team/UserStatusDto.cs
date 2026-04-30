using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;

namespace OneMoreTaskTracker.Api.Controllers.Team;

public sealed record UserStatusDto(
    int Active,
    DateTime? LastActive,
    StateMixDto Mix)
{
    public static readonly UserStatusDto Empty = new(0, null, StateMixDto.Empty);

    internal static UserStatusDto From(AssigneeTaskSummary? status)
    {
        if (status is null)
            return Empty;

        return new UserStatusDto(
            status.ActiveCount,
            status.LastActivityAt?.ToDateTime(),
            StateMixDto.From(status.Mix));
    }
}
