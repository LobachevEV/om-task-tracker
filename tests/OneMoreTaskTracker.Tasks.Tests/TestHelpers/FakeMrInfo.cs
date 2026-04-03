using OneMoreTaskTracker.Tasks.MergeRequests;

namespace OneMoreTaskTracker.Tasks.Tests.TestHelpers;

public record FakeMrInfo(
    int Iid,
    int ProjectId = 1,
    string ProjectName = "project",
    string Title = "title",
    string SourceBranch = "feature/test",
    string TargetBranch = "release",
    string[] Labels = null!) : IMrInfo
{
    public string[] Labels { get; init; } = Labels ?? [];
}
