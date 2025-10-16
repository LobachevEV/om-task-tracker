namespace OneMoreTaskTracker.Tasks.MergeRequests;

public record struct MergeRequestInfo(int Id, string Title, string SourceBranch, string TargetBranch);