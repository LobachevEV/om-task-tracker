using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Tasks.MergeRequests;
using OneMoreTaskTracker.Tasks.Projects;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using Task = OneMoreTaskTracker.Tasks.Tasks.Data.Task;

namespace OneMoreTaskTracker.Tasks.Tasks.Create;

public class CreateTaskHandler(
    TasksDbContext tasksDbContext,
    IProjectsProvider projectsProvider,
    IMrsProvider mrsProvider) : TaskCreator.TaskCreatorBase
{
    public override async System.Threading.Tasks.Task Create(
        CreateTaskRequest request,
        IServerStreamWriter<CreateTaskResponse> responseStream,
        ServerCallContext context)
    {
        var task = new Task
        {
            JiraId = request.JiraTaskId,
            UserId = request.UserId,
        };
        task.AttachToFeature(request.FeatureId);

        await tasksDbContext.Tasks.AddAsync(task, context.CancellationToken);
        await tasksDbContext.SaveChangesAsync(context.CancellationToken);
        await responseStream.WriteAsync(new CreateTaskResponse { Task = task.Adapt<TaskDto>() });

        await foreach (var mr in mrsProvider.Find(request.JiraTaskId, "opened", context.CancellationToken))
            task.AddMr(mr);

        if (task.MergeRequests.Count > 0)
        {
            await tasksDbContext.SaveChangesAsync(context.CancellationToken);
            await responseStream.WriteAsync(new CreateTaskResponse
            {
                Task = task.Adapt<TaskDto>(),
                MergeRequests = { task.MergeRequests.Adapt<MergeRequestDto[]>() },
                Projects = { task.GitRepos.Adapt<ProjectDto[]>() }
            });
            return;
        }

        await foreach (var dto in projectsProvider.Get(request.UserId, request.JiraTaskId, request.StartDate))
            task.AddProject(dto.Id, dto.Name);

        if (task.GitRepos.Count == 0)
        {
            return;
        }

        await tasksDbContext.SaveChangesAsync(context.CancellationToken);
        await responseStream.WriteAsync(new CreateTaskResponse
        {
            Task = task.Adapt<TaskDto>(),
            Projects = { task.GitRepos.Adapt<ProjectDto[]>() }
        });
    }
}