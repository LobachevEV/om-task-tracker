using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using Task = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tasks.List;

public class ListTasksHandler(TasksDbContext dbContext) : TaskLister.TaskListerBase
{
    private const string RoleDeveloper = "Developer";
    private const string RoleManager = "Manager";

    public override async System.Threading.Tasks.Task<ListTasksResponse> ListTasks(ListTasksRequest request, ServerCallContext context)
    {
        IQueryable<Task> query = dbContext.Tasks;

        if (request.Role == RoleDeveloper)
        {
            query = query.Where(t => t.UserId == request.UserId);
        }
        else if (request.Role == RoleManager)
        {
            var allowedIds = request.TeamMemberIds.ToList();
            query = query.Where(t => allowedIds.Contains(t.UserId));
        }
        else
        {
            return new ListTasksResponse();
        }

        var tasks = await query
            .OrderByDescending(t => t.Id)
            .Take(500)
            .ToListAsync(context.CancellationToken);

        var response = new ListTasksResponse();
        response.Tasks.AddRange(tasks.Select(t =>
            new TaskDto { Id = t.Id, JiraTaskId = t.JiraId, State = (TaskState)t.State, UserId = t.UserId }));
        return response;
    }
}
