using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;

namespace OneMoreTaskTracker.Api.Controllers.Team;

public sealed record StateMixDto(
    int InDev,
    int MrToRelease,
    int InTest,
    int MrToMaster,
    int Completed)
{
    public static readonly StateMixDto Empty = new(0, 0, 0, 0, 0);

    internal static StateMixDto From(TaskStateMix mix) =>
        new(mix.InDev, mix.MrToRelease, mix.InTest, mix.MrToMaster, mix.Completed);
}
