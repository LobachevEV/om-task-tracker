using TaskEntity = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tests.TestHelpers;

internal static class TaskTestExtensions
{
    public static TaskEntity WithFeature(this TaskEntity task, int featureId)
    {
        task.AttachToFeature(featureId);
        return task;
    }
}
