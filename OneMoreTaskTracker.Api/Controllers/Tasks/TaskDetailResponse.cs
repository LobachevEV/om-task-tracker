namespace OneMoreTaskTracker.Api.Controllers.Tasks;

public record TaskDetailResponse(
    string JiraId,
    string State,
    List<ProjectResponse> Projects,
    List<MergeRequestResponse> MergeRequests);
