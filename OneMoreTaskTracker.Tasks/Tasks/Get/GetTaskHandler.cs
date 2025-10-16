using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Tasks.MergeRequests;
using OneMoreTaskTracker.Tasks.Projects;

namespace OneMoreTaskTracker.Tasks.Tasks.Get;

public class GetTaskHandler(
    IProjectsProvider projectsProvider,
    IMrsProvider mrsProvider
) : TaskGetter.TaskGetterBase
{
    public override async Task<GetTaskResponse> Get(GetTaskRequest request, ServerCallContext context)
    {
        var mrProjectAgg = await mrsProvider.Find(request.TaskId, "merged", context.CancellationToken)
            .AggregateAsync(new { Mrs = new List<MergeRequestInfo>(), Projects = new List<Project>() },
                (acc, mr) =>
                {
                    acc.Mrs.Add(new MergeRequestInfo(mr.Iid, mr.Title, mr.SourceBranch, mr.TargetBranch));
                    acc.Projects.Add(new Project(mr.ProjectId, mr.ProjectName));
                    return acc;
                });
        if (mrProjectAgg.Mrs.Count > 0)
        {
            return new GetTaskResponse()
            {
                Id = request.TaskId,
                State = TaskState.InTest,
                MergeRequests = { mrProjectAgg.Mrs.Adapt<MergeRequestDto[]>() },
                Projects = { mrProjectAgg.Projects.Adapt<ProjectDto[]>() }
            };
        }

        var projects = await projectsProvider.Get(request.UserId, request.TaskId, request.FirstPushDate).ToArrayAsync();
        var state = projects.Length == 0 ? TaskState.NotStarted : TaskState.InDev;
        return new GetTaskResponse
        {
            Id = request.TaskId,
            State = state,
            Projects = { projects.Adapt<ProjectDto[]>() }
        };
    }
}