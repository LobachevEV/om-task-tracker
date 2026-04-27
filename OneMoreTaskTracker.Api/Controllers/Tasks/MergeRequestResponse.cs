namespace OneMoreTaskTracker.Api.Controllers.Tasks;

public record MergeRequestResponse(string Id, string Title, string SourceBranch, string TargetBranch);
