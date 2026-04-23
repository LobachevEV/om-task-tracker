namespace OneMoreTaskTracker.Api.Controllers;

public record MergeRequestResponse(string Id, string Title, string SourceBranch, string TargetBranch);
