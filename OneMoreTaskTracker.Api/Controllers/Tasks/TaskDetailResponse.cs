namespace OneMoreTaskTracker.Api.Controllers;

public record TaskDetailResponse(
    string JiraId,
    string State,
    List<ProjectResponse> Projects,
    List<MergeRequestResponse> MergeRequests);
