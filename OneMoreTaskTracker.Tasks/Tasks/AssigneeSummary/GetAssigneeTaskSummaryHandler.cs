using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Tasks.Tasks.Data;

namespace OneMoreTaskTracker.Tasks.Tasks.AssigneeSummary;

public class GetAssigneeTaskSummaryHandler(TasksDbContext dbContext) : TaskAggregateQuery.TaskAggregateQueryBase
{
    public override async Task<BatchGetAssigneeTaskSummaryResponse> BatchGetAssigneeTaskSummary(
        BatchGetAssigneeTaskSummaryRequest request, ServerCallContext context)
    {
        if (request.AssigneeUserIds.Count == 0)
            return new BatchGetAssigneeTaskSummaryResponse();

        // Single grouped query to get status for all assignees
        var assigneeIds = request.AssigneeUserIds.ToList();

        var summaries = await dbContext.Tasks
            .Where(t => assigneeIds.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new
            {
                AssigneeUserId = g.Key,
                ActiveCount = g.Count(t => t.State != (int)TaskState.Completed),
                InDev = g.Count(t => t.State == (int)TaskState.InDev),
                MrToRelease = g.Count(t => t.State == (int)TaskState.MrToRelease),
                InTest = g.Count(t => t.State == (int)TaskState.InTest),
                MrToMaster = g.Count(t => t.State == (int)TaskState.MrToMaster),
                Completed = g.Count(t => t.State == (int)TaskState.Completed)
                // Note: last_activity_at would require a timestamp column in the Task model
                // For now, we return unset/null for all assignees
            })
            .ToListAsync(context.CancellationToken);

        var response = new BatchGetAssigneeTaskSummaryResponse();

        // Add summaries for assignees with tasks
        foreach (var summary in summaries)
        {
            var assigneeSummary = new AssigneeTaskSummary
            {
                AssigneeUserId = summary.AssigneeUserId,
                ActiveCount = summary.ActiveCount,
                Mix = new TaskStateMix
                {
                    InDev = summary.InDev,
                    MrToRelease = summary.MrToRelease,
                    InTest = summary.InTest,
                    MrToMaster = summary.MrToMaster,
                    Completed = summary.Completed
                }
                // LastActivityAt left unset (null) - would be populated by a timestamp from task events
            };

            response.Summaries.Add(assigneeSummary);
        }

        // Add entries for assignees with no tasks
        var assigneesWithTasks = summaries.Select(s => s.AssigneeUserId).ToHashSet();
        var assigneesWithoutTasks = assigneeIds.Where(id => !assigneesWithTasks.Contains(id));

        foreach (var assigneeId in assigneesWithoutTasks)
        {
            var assigneeSummary = new AssigneeTaskSummary
            {
                AssigneeUserId = assigneeId,
                ActiveCount = 0,
                Mix = new TaskStateMix
                {
                    InDev = 0,
                    MrToRelease = 0,
                    InTest = 0,
                    MrToMaster = 0,
                    Completed = 0
                }
            };
            // Leave LastActivityAt unset (null)

            response.Summaries.Add(assigneeSummary);
        }

        return response;
    }
}
