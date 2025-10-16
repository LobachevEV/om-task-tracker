namespace OneMoreTaskTracker.Tasks.MergeRequests;

public interface IMrInfo
{
    int Iid { get; }
    int ProjectId { get; }
    string ProjectName { get; }
    string Title { get; }
    string SourceBranch { get; }
    string TargetBranch { get; }
    string[] Labels { get; }
}
