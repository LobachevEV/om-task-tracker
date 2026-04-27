using OneMoreTaskTracker.Proto.Tasks;

namespace OneMoreTaskTracker.Api.Controllers.Tasks;

internal static class TasksMapper
{
    internal static string MapState(TaskState state, ILogger logger) => state switch
    {
        TaskState.NotStarted  => "NotStarted",
        TaskState.InDev       => "InDev",
        TaskState.MrToRelease => "MrToRelease",
        TaskState.InTest      => "InTest",
        TaskState.MrToMaster  => "MrToMaster",
        TaskState.Completed   => "Completed",
        _ => LogAndReturnUnknown(state, logger)
    };

    private static string LogAndReturnUnknown(TaskState state, ILogger logger)
    {
        logger.LogWarning("Unexpected TaskState value {State}; returning \"Unknown\"", state);
        return "Unknown";
    }
}
