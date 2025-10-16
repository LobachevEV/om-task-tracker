using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Tasks.MergeRequests;

namespace OneMoreTaskTracker.Tasks.Tasks.Data;

public class Task
{
    public int Id { get; init; }
    public required string JiraId { get; init; }
    public int UserId { get; init; }
    public int State { get; private set; } = (int)TaskState.NotStarted;
    public List<MergeRequest> MergeRequests { get; init; } = [];
    public List<GitRepo> GitRepos { get; init; } = [];

    public void AddMr(IMrInfo mr)
    {
        if (MergeRequests.Any(m => m.ExternalId == mr.Iid))
            return;

        if (GitRepos.All(r => r.ExternalId != mr.ProjectId))
            GitRepos.Add(new GitRepo { ExternalId = mr.ProjectId, Name = mr.ProjectName, Link = "" });

        MergeRequests.Add(new MergeRequest
        {
            ExternalId = mr.Iid,
            ExternalProjectId = mr.ProjectId,
            TaskId = Id,
            Title = mr.Title,
            Link = "",
            Labels = mr.Labels
        });

        State = State switch
        {
            (int)TaskState.NotStarted when mr.TargetBranch == "master" => (int)TaskState.MrToMaster,
            (int)TaskState.NotStarted => (int)TaskState.MrToRelease,
            (int)TaskState.MrToMaster when mr.TargetBranch != "master" => (int)TaskState.MrToRelease,
            _ => State
        };
    }

    public void AddProject(int externalId, string name)
    {
        if (!GitRepos.Any(r => r.ExternalId == externalId))
            GitRepos.Add(new GitRepo { ExternalId = externalId, Name = name, Link = "" });

        State = State switch
        {
            (int)TaskState.NotStarted => (int)TaskState.InDev,
            _ => State
        };
    }
}