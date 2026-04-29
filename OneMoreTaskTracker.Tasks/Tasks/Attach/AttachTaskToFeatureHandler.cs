using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using Task = System.Threading.Tasks.Task;

namespace OneMoreTaskTracker.Tasks.Tasks.Attach;

public class AttachTaskToFeatureHandler(TasksDbContext db) : TaskFeatureLinker.TaskFeatureLinkerBase
{
    public override async Task<AttachTaskToFeatureResponse> Attach(
        AttachTaskToFeatureRequest request,
        ServerCallContext context)
    {
        var task = await db.Tasks
            .FirstOrDefaultAsync(t => t.JiraId == request.JiraTaskId, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"task {request.JiraTaskId} not found"));

        if (task.FeatureId != request.FeatureId)
        {
            task.AttachToFeature(request.FeatureId);
            await db.SaveChangesAsync(context.CancellationToken);
        }

        return new AttachTaskToFeatureResponse
        {
            TaskId = task.Id,
            JiraTaskId = task.JiraId,
            FeatureId = task.FeatureId,
            State = (Proto.Tasks.TaskState)task.State,
        };
    }

    public override async Task<AttachTaskToFeatureResponse> Detach(
        DetachTaskFromFeatureRequest request,
        ServerCallContext context)
    {
        return await Attach(
            new AttachTaskToFeatureRequest
            {
                JiraTaskId = request.JiraTaskId,
                FeatureId = request.ReassignToFeatureId,
            },
            context);
    }
}
