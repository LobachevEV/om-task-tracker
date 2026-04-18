using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.GetUserStatusQuery;
using OneMoreTaskTracker.Tasks.Tasks.Data;

namespace OneMoreTaskTracker.Tasks.Tasks.GetUserStatus;

public class BatchGetUserStatusHandler(TasksDbContext dbContext) : UserStatusQuery.UserStatusQueryBase
{
    public override async Task<BatchGetUserStatusResponse> BatchGetUserStatus(
        BatchGetUserStatusRequest request, ServerCallContext context)
    {
        if (request.UserIds.Count == 0)
            return new BatchGetUserStatusResponse();

        // Single grouped query to get status for all users
        var userIds = request.UserIds.ToList();

        var statuses = await dbContext.Tasks
            .Where(t => userIds.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Active = g.Count(t => t.State != (int)TaskState.Completed),
                InDev = g.Count(t => t.State == (int)TaskState.InDev),
                MrToRelease = g.Count(t => t.State == (int)TaskState.MrToRelease),
                InTest = g.Count(t => t.State == (int)TaskState.InTest),
                MrToMaster = g.Count(t => t.State == (int)TaskState.MrToMaster),
                Completed = g.Count(t => t.State == (int)TaskState.Completed)
                // Note: last_active would require a timestamp column in the Task model
                // For now, we return unset/null for all users
            })
            .ToListAsync(context.CancellationToken);

        var response = new BatchGetUserStatusResponse();

        // Add statuses for users with tasks
        foreach (var status in statuses)
        {
            var userStatus = new UserStatus
            {
                UserId = status.UserId,
                Active = status.Active,
                Mix = new UserStateMix
                {
                    InDev = status.InDev,
                    MrToRelease = status.MrToRelease,
                    InTest = status.InTest,
                    MrToMaster = status.MrToMaster,
                    Completed = status.Completed
                }
                // LastActive left unset (null) - would be populated by a timestamp from task events
            };

            response.Statuses.Add(userStatus);
        }

        // Add entries for users with no tasks
        var usersWithTasks = statuses.Select(s => s.UserId).ToHashSet();
        var usersWithoutTasks = userIds.Where(id => !usersWithTasks.Contains(id));

        foreach (var userId in usersWithoutTasks)
        {
            var userStatus = new UserStatus
            {
                UserId = userId,
                Active = 0,
                Mix = new UserStateMix
                {
                    InDev = 0,
                    MrToRelease = 0,
                    InTest = 0,
                    MrToMaster = 0,
                    Completed = 0
                }
            };
            // Leave LastActive unset (null)

            response.Statuses.Add(userStatus);
        }

        return response;
    }
}
